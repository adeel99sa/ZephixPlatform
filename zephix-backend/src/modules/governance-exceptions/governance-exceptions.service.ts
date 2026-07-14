import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { GovernanceException } from './entities/governance-exception.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../audit/audit.constants';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';

/**
 * OV-BE-1 (item 3): member-safe view of a project's exceptions. Derived from
 * data the requester can already see (the block message, phase, gate, tasks).
 * No approve/reject affordance — SEEING is not APPROVING.
 */
export interface ProjectExceptionView {
  id: string;
  type: string;
  status: string;
  requestedBy: string;
  requestedAt: Date;
  /** The policy code(s) that fired (e.g. PHASE_GATE_REQUIRED). */
  policyCodes: string[];
  /** The phase this exception relates to, when known. */
  phaseId: string | null;
  /** The task whose transition raised it, when known. */
  taskId: string | null;
}

@Injectable()
export class GovernanceExceptionsService {
  private readonly logger = new Logger(GovernanceExceptionsService.name);

  constructor(
    @InjectRepository(GovernanceException)
    private readonly repo: Repository<GovernanceException>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * OV-BE-1 (item 3): list exceptions for ONE project, member-readable.
   *
   * Tenant-scoped by (organizationId, workspaceId, projectId) — ALL THREE in
   * the WHERE. A member of workspace A passing a project that lives in
   * workspace B gets zero rows (B's exceptions carry workspaceId=B), so this
   * can never leak another workspace's queue. Never the org-wide queue.
   * Read-only projection: no approve/reject surface is exposed here.
   */
  async listForProject(
    organizationId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectExceptionView[]> {
    const rows = await this.repo.find({
      where: { organizationId, workspaceId, projectId },
      order: { createdAt: 'DESC' },
    });

    return rows.map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const codes = meta.policyCodes;
      return {
        id: e.id,
        type: e.exceptionType,
        status: e.status,
        requestedBy: e.requestedByUserId,
        requestedAt: e.createdAt,
        policyCodes: Array.isArray(codes)
          ? (codes.filter((c) => typeof c === 'string') as string[])
          : [],
        phaseId: typeof meta.phaseId === 'string' ? meta.phaseId : null,
        taskId: typeof meta.taskId === 'string' ? meta.taskId : null,
      };
    });
  }

  async create(
    input: {
      organizationId: string;
      workspaceId: string;
      projectId?: string;
      exceptionType: string;
      reason: string;
      requestedByUserId: string;
      auditEventId?: string;
      metadata?: Record<string, any>;
      /** Platform role of the requester for audit attribution. */
      actorPlatformRole?: string;
    },
    /**
     * GATE-SUB-1: optional caller-supplied transaction manager. When present,
     * the exception row + its fail-closed audit are saved through it, so the
     * caller can co-commit the exception with a companion write (the auto-
     * created gate DRAFT submission) — both land or neither does.
     */
    manager?: EntityManager,
  ): Promise<GovernanceException> {
    const repo = manager
      ? manager.getRepository(GovernanceException)
      : this.repo;
    const exception = repo.create({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      exceptionType: input.exceptionType,
      reason: input.reason,
      requestedByUserId: input.requestedByUserId,
      auditEventId: input.auditEventId ?? null,
      metadata: input.metadata ?? null,
      status: 'PENDING',
    });
    const saved = await repo.save(exception);

    const auditInput = {
      organizationId: saved.organizationId,
      workspaceId: saved.workspaceId,
      actorUserId: saved.requestedByUserId,
      actorPlatformRole: input.actorPlatformRole ?? 'MEMBER',
      entityType: AuditEntityType.PROJECT,
      entityId: saved.projectId ?? saved.workspaceId,
      action: AuditAction.GOVERNANCE_EVALUATE,
      metadata: {
        governanceType: 'EXCEPTION_CREATED',
        exceptionId: saved.id,
        exceptionType: saved.exceptionType,
        projectId: saved.projectId,
        reason: saved.reason,
      },
    };
    // Co-commit the audit through the caller's manager when one is supplied;
    // otherwise the stand-alone form (unchanged for existing callers).
    if (manager) {
      await this.auditService.recordOrThrow(auditInput, { manager });
    } else {
      await this.auditService.recordOrThrow(auditInput);
    }

    return saved;
  }

  /**
   * Find an existing PENDING GOVERNANCE_RULE exception for the same task transition
   * (used to avoid duplicate rows when the user retries before admin action).
   */
  async findPendingGovernanceRuleForTaskTransition(params: {
    organizationId: string;
    taskId: string;
    toStatus: string;
  }): Promise<GovernanceException | null> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('e.status = :status', { status: 'PENDING' })
      .andWhere('e.exception_type = :type', { type: 'GOVERNANCE_RULE' })
      .andWhere("e.metadata->>'taskId' = :taskId", { taskId: params.taskId })
      .andWhere("e.metadata->>'toStatus' = :toStatus", { toStatus: params.toStatus })
      .orderBy('e.created_at', 'DESC')
      .getOne();
  }

  /** Resolves workspace/project display names for pending decision rows (org-scoped). */
  async resolvePendingDecisionContext(
    organizationId: string,
    rows: GovernanceException[],
  ): Promise<{
    workspaceNames: Map<string, string>;
    projectNames: Map<string, string>;
  }> {
    const workspaceNames = new Map<string, string>();
    const projectNames = new Map<string, string>();
    if (rows.length === 0) {
      return { workspaceNames, projectNames };
    }

    const workspaceIds = [
      ...new Set(rows.map((row) => row.workspaceId).filter(Boolean)),
    ];
    const projectIds = [
      ...new Set(
        rows
          .map((row) => this.resolveProjectId(row))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (workspaceIds.length > 0) {
      const workspaces = await this.workspaceRepo.find({
        where: { organizationId, id: In(workspaceIds) },
        select: ['id', 'name'],
      });
      for (const ws of workspaces) {
        workspaceNames.set(ws.id, ws.name?.trim() || 'Unknown workspace');
      }
    }

    if (projectIds.length > 0) {
      const projects = await this.projectRepo.find({
        where: { organizationId, id: In(projectIds) },
        select: ['id', 'name'],
      });
      for (const project of projects) {
        projectNames.set(project.id, project.name?.trim() || 'Unknown project');
      }
    }

    return { workspaceNames, projectNames };
  }

  resolveProjectId(row: GovernanceException): string | null {
    if (row.projectId) return row.projectId;
    const metaPid = row.metadata?.projectId;
    return typeof metaPid === 'string' && metaPid.trim() ? metaPid : null;
  }

  async listByOrg(
    organizationId: string,
    filters?: { status?: string; workspaceId?: string; exceptionType?: string },
    page = 1,
    limit = 20,
  ): Promise<{ items: GovernanceException[]; total: number }> {
    const qb = this.repo.createQueryBuilder('e')
      .where('e.organization_id = :organizationId', { organizationId })
      .orderBy('e.created_at', 'DESC');

    if (filters?.status) qb.andWhere('e.status = :status', { status: filters.status });
    if (filters?.workspaceId) qb.andWhere('e.workspace_id = :workspaceId', { workspaceId: filters.workspaceId });
    if (filters?.exceptionType) qb.andWhere('e.exception_type = :exceptionType', { exceptionType: filters.exceptionType });

    const total = await qb.getCount();
    const items = await qb.skip((page - 1) * limit).take(limit).getMany();
    return { items, total };
  }

  /**
   * GOV-FIX-B1 (1.3): recent governance activity — a REAL query over
   * governance_exceptions (the live activity source: requests, approvals,
   * rejections, gate blocks, each with an actor + timestamp), workspace-scoped,
   * most recent first. Honest empty when there is none. This is NOT a stub — if
   * the query cannot run it THROWS (no `[]` fallback masking a broken feed).
   */
  async listRecentActivity(
    organizationId: string,
    workspaceId: string | undefined,
    limit = 20,
  ): Promise<
    Array<{
      id: string;
      eventType: string;
      exceptionType: string;
      status: string;
      description: string;
      workspaceId: string;
      actorUserId: string | null;
      timestamp: string | null;
    }>
  > {
    const bounded = Math.min(Math.max(1, limit), 100);
    const { items } = await this.listByOrg(
      organizationId,
      { workspaceId },
      1,
      bounded,
    );
    return items.map((row) => {
      const ts = row.updatedAt ?? row.createdAt;
      return {
        id: row.id,
        eventType: `governance.exception.${(row.status || 'unknown').toLowerCase()}`,
        exceptionType: row.exceptionType,
        status: row.status,
        description: `${row.exceptionType} — ${row.status}${row.reason ? `: ${row.reason}` : ''}`,
        workspaceId: row.workspaceId,
        actorUserId: row.resolvedByUserId ?? row.requestedByUserId ?? null,
        timestamp: ts ? new Date(ts).toISOString() : null,
      };
    });
  }

  /**
   * Find an APPROVED (not yet consumed) exception for the same task transition.
   * Used by WorkTasksService to bypass gate enforcement when an admin override exists.
   */
  async findApprovedUnconsumedForTaskTransition(params: {
    organizationId: string;
    taskId: string;
    toStatus: string;
  }): Promise<GovernanceException | null> {
    return this.repo
      .createQueryBuilder('e')
      .where('e.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('e.status = :status', { status: 'APPROVED' })
      .andWhere('e.exception_type = :type', { type: 'GOVERNANCE_RULE' })
      .andWhere("e.metadata->>'taskId' = :taskId", { taskId: params.taskId })
      .andWhere("e.metadata->>'toStatus' = :toStatus", {
        toStatus: params.toStatus,
      })
      .orderBy('e.created_at', 'DESC')
      .getOne();
  }

  /**
   * Flip an APPROVED exception to CONSUMED (single-use consumption).
   * Called atomically inside the task-update transaction when a bypass is granted.
   */
  async consumeException(
    id: string,
    organizationId: string,
    consumedByUserId: string,
  ): Promise<GovernanceException> {
    const exception = await this.repo.findOne({ where: { id, organizationId } });
    if (!exception) throw new NotFoundException('Exception not found');
    if (exception.status !== 'APPROVED') {
      throw new ForbiddenException('Only APPROVED exceptions can be consumed');
    }

    exception.status = 'CONSUMED';
    exception.resolvedByUserId = consumedByUserId;

    let saved!: GovernanceException;
    await this.repo.manager.transaction(async (manager: EntityManager) => {
      saved = await manager.save(GovernanceException, exception);
      await this.auditService.recordOrThrow(
        {
          organizationId,
          workspaceId: exception.workspaceId,
          actorUserId: consumedByUserId,
          actorPlatformRole: 'MEMBER',
          entityType: AuditEntityType.PROJECT,
          entityId: exception.projectId ?? exception.workspaceId,
          action: AuditAction.GOVERNANCE_EVALUATE,
          metadata: {
            governanceType: 'EXCEPTION_CONSUMED',
            exceptionId: id,
            exceptionType: exception.exceptionType,
            projectId: exception.projectId,
          },
        },
        { manager },
      );
    });

    return saved;
  }

  async resolve(
    id: string,
    organizationId: string,
    resolverUserId: string,
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO',
    note?: string,
  ): Promise<GovernanceException> {
    const exception = await this.repo.findOne({
      where: { id, organizationId },
    });
    if (!exception) throw new NotFoundException('Exception not found');
    if (exception.status !== 'PENDING' && exception.status !== 'NEEDS_INFO') {
      throw new ForbiddenException('Exception is already resolved');
    }

    exception.status = decision;
    exception.resolvedByUserId = resolverUserId;
    exception.resolutionNote = note ?? null;

    let saved!: GovernanceException;
    await this.repo.manager.transaction(async (manager: EntityManager) => {
      saved = await manager.save(GovernanceException, exception);
      await this.auditService.recordOrThrow(
        {
          organizationId,
          workspaceId: exception.workspaceId,
          actorUserId: resolverUserId,
          actorPlatformRole: 'ADMIN',
          entityType: AuditEntityType.PROJECT,
          entityId: exception.projectId ?? exception.workspaceId,
          action: AuditAction.GOVERNANCE_EVALUATE,
          metadata: {
            governanceType: 'EXCEPTION_RESOLUTION',
            exceptionId: id,
            exceptionType: exception.exceptionType,
            decision,
            note,
          },
        },
        { manager },
      );
    });

    return saved;
  }

  async getHealth(organizationId: string): Promise<{
    activePolicies: number;
    capacityWarnings: number;
    budgetWarnings: number;
    hardBlocksThisWeek: number;
  }> {
    // Count pending exceptions by type
    const pending = await this.repo.count({
      where: { organizationId, status: 'PENDING' },
    });

    const capacityPending = await this.repo.count({
      where: { organizationId, status: 'PENDING', exceptionType: 'CAPACITY' },
    });

    const budgetPending = await this.repo.count({
      where: { organizationId, status: 'PENDING', exceptionType: 'BUDGET' },
    });

    return {
      activePolicies: pending,
      capacityWarnings: capacityPending,
      budgetWarnings: budgetPending,
      hardBlocksThisWeek: 0, // MVP: no hard blocks yet
    };
  }
}
