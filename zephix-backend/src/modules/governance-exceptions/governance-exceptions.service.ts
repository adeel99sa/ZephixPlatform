import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In, MoreThanOrEqual } from 'typeorm';
import { GovernanceException } from './entities/governance-exception.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../audit/audit.constants';
import {
  Workspace,
  selfApprovalAllowedForMode,
} from '../workspaces/entities/workspace.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';

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
  /**
   * DTO-GAPS-1: display name for `requestedBy` (name → email → id). Resolved on
   * the backend so the UI never renders a bare UUID next to a governance
   * statement, and never infers identity by comparing actor ids.
   */
  requestedByName: string;
  requestedAt: Date;
  /** The policy code(s) that fired (e.g. PHASE_GATE_REQUIRED). */
  policyCodes: string[];
  /** The phase this exception relates to, when known. */
  phaseId: string | null;
  /** The task whose transition raised it, when known. */
  taskId: string | null;
  /**
   * SOD-PORT-1: true when the resolver was the requester (self-approval). The
   * UI must show this so a self-approval is never read as peer review.
   */
  selfResolved: boolean;
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * DTO-GAPS-1: resolve actor user ids to a human label (name → email → id).
   * Batch-fetched to avoid N+1. Any id with no user row falls back to the id
   * itself, so a caller always gets a non-empty label — the FE is never handed a
   * bare UUID it would have to interpret, and never infers identity by comparing
   * actor ids.
   */
  async resolveActorNames(
    userIds: Array<string | null | undefined>,
  ): Promise<Map<string, string>> {
    const ids = Array.from(
      new Set(userIds.filter((x): x is string => typeof x === 'string' && x.length > 0)),
    );
    const map = new Map<string, string>();
    if (ids.length === 0) return map;
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'firstName', 'lastName', 'email'],
    });
    for (const u of users) {
      const label =
        `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id;
      map.set(u.id, label);
    }
    for (const id of ids) if (!map.has(id)) map.set(id, id);
    return map;
  }

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

    const names = await this.resolveActorNames(
      rows.map((e) => e.requestedByUserId),
    );

    return rows.map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const codes = meta.policyCodes;
      return {
        id: e.id,
        type: e.exceptionType,
        status: e.status,
        requestedBy: e.requestedByUserId,
        requestedByName:
          names.get(e.requestedByUserId) ?? e.requestedByUserId,
        requestedAt: e.createdAt,
        policyCodes: Array.isArray(codes)
          ? (codes.filter((c) => typeof c === 'string') as string[])
          : [],
        phaseId: typeof meta.phaseId === 'string' ? meta.phaseId : null,
        taskId: typeof meta.taskId === 'string' ? meta.taskId : null,
        selfResolved: e.selfResolved === true,
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
      /**
       * DTO-GAPS-1: display name for `actorUserId` (name → email → id), so the
       * history feed shows who resolved/requested — not a truncated UUID.
       */
      actorName: string | null;
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
    const names = await this.resolveActorNames(
      items.map((row) => row.resolvedByUserId ?? row.requestedByUserId),
    );
    return items.map((row) => {
      const ts = row.updatedAt ?? row.createdAt;
      const actorUserId = row.resolvedByUserId ?? row.requestedByUserId ?? null;
      return {
        id: row.id,
        eventType: `governance.exception.${(row.status || 'unknown').toLowerCase()}`,
        exceptionType: row.exceptionType,
        status: row.status,
        description: `${row.exceptionType} — ${row.status}${row.reason ? `: ${row.reason}` : ''}`,
        workspaceId: row.workspaceId,
        actorUserId,
        actorName: actorUserId ? (names.get(actorUserId) ?? actorUserId) : null,
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
  /**
   * ATOMICITY-1 (4.1): consume an APPROVED exception as a single-use override.
   *
   * The old path read the row, checked status in memory, then save()d keyed on
   * the PK with NO status guard — so two concurrent requests could both observe
   * APPROVED and both flip it to CONSUMED (double-spend the override). This is
   * now an ATOMIC conditional UPDATE: only a row still in APPROVED transitions,
   * and we assert affected-rows === 1 — the loser of a race (or a not-yet-
   * approved / already-consumed row) fails the operation rather than silently
   * "succeeding" on zero rows (the silent-allow class).
   *
   * Pass a caller `manager` to co-commit the consumption with the governed write
   * (task transition) in one transaction, so an override is never burned when
   * the write it authorised rolls back.
   */
  async consumeException(
    id: string,
    organizationId: string,
    consumedByUserId: string,
    manager?: EntityManager,
  ): Promise<GovernanceException> {
    const run = async (mgr: EntityManager): Promise<GovernanceException> => {
      const result = await mgr
        .createQueryBuilder()
        .update(GovernanceException)
        .set({ status: 'CONSUMED', resolvedByUserId: consumedByUserId })
        .where(
          'id = :id AND organization_id = :organizationId AND status = :status',
          { id, organizationId, status: 'APPROVED' },
        )
        .execute();

      // affected-rows === 1 is the runtime enforcement of the guard. Zero rows
      // means: not found, wrong org, or already-consumed/not-approved (lost the
      // race). Distinguish not-found for a truthful error; otherwise it is a
      // state conflict, never a silent success.
      if (result.affected !== 1) {
        const existing = await mgr.findOne(GovernanceException, {
          where: { id, organizationId },
        });
        if (!existing) throw new NotFoundException('Exception not found');
        throw new ForbiddenException(
          'Only APPROVED exceptions can be consumed (already consumed or not approved)',
        );
      }

      // Re-fetch the mapped entity within the same tx (now CONSUMED) for the
      // audit + return — .returning() would give raw snake_case columns.
      const saved = (await mgr.findOne(GovernanceException, {
        where: { id, organizationId },
      }))!;
      await this.auditService.recordOrThrow(
        {
          organizationId,
          workspaceId: saved.workspaceId,
          actorUserId: consumedByUserId,
          actorPlatformRole: 'MEMBER',
          entityType: AuditEntityType.PROJECT,
          entityId: saved.projectId ?? saved.workspaceId,
          action: AuditAction.GOVERNANCE_EVALUATE,
          metadata: {
            governanceType: 'EXCEPTION_CONSUMED',
            exceptionId: id,
            exceptionType: saved.exceptionType,
            projectId: saved.projectId,
          },
        },
        { manager: mgr },
      );

      return saved;
    };

    // Co-commit with the caller's transaction when provided; otherwise open our own.
    if (manager) return run(manager);
    return this.repo.manager.transaction(run);
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

    // SOD-PORT-1: self-approval control, ordered BEFORE the state mutation.
    // The identity comparison is the requester vs the resolver. Approving your
    // OWN request is blocked in GOVERNED workspaces (full separation of duties)
    // and permitted — but recorded — in LEAN/STANDARD. Self-REJECT / NEEDS_INFO
    // is harmless and never blocked (you cannot rubber-stamp yourself by denying
    // your own request), mirroring the gate path which bans only APPROVED.
    const isSelfResolution = resolverUserId === exception.requestedByUserId;
    if (isSelfResolution && decision === 'APPROVED') {
      const allowed = await this.isSelfApprovalAllowed(
        organizationId,
        exception.workspaceId,
      );
      if (!allowed) {
        throw new ForbiddenException({
          code: 'SELF_APPROVAL_FORBIDDEN',
          message:
            'You cannot approve your own exception request in a governed workspace. A separate approver is required (separation of duties).',
        });
      }
    }

    exception.status = decision;
    exception.resolvedByUserId = resolverUserId;
    exception.resolutionNote = note ?? null;
    exception.selfResolved = isSelfResolution;

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
            // The receipt must not imply peer review that did not happen.
            selfResolved: isSelfResolution,
          },
        },
        { manager },
      );
    });

    return saved;
  }

  /**
   * SOD-PORT-1: does the workspace's complexity mode permit self-approval?
   * Reads complexity_mode from the Workspace (org-scoped). Fails CLOSED — an
   * unresolvable workspace/mode is treated as BLOCKED, never silently allowed.
   */
  private async isSelfApprovalAllowed(
    organizationId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const ws = await this.workspaceRepo.findOne({
      where: { id: workspaceId, organizationId },
      select: ['id', 'complexityMode'],
    });
    return selfApprovalAllowedForMode(ws?.complexityMode);
  }

  /**
   * HONESTY-1: governance health counts.
   *
   * `scope` names exactly what the counts cover: 'workspace' when a workspaceId
   * is supplied, else 'organization'. The frontend renders the Policies catalog
   * per-workspace, so it passes the same workspaceId here to make the numbers
   * line up instead of showing one workspace's policies beside the whole org's
   * counts.
   *
   * `hardBlocksThisWeek` is a REAL count (no longer a hardcoded 0): governance
   * exceptions of type GOVERNANCE_RULE created in the last 7 days. Those rows
   * are written ONLY by the block-and-throw path (a task transition / phase
   * gate that was refused — see work-tasks.service throwBlocked), each carrying
   * the policy codes that fired, and deduped per (task, transition) — so this
   * is the count of DISTINCT hard blocks. CAPACITY / BUDGET exceptions are
   * WARN-mode and excluded. An honest 0 (a real query over an empty week) is
   * fine; a hardcoded 0 was not.
   */
  async getHealth(
    organizationId: string,
    workspaceId?: string,
  ): Promise<{
    activePolicies: number;
    capacityWarnings: number;
    budgetWarnings: number;
    hardBlocksThisWeek: number;
    scope: 'workspace' | 'organization';
  }> {
    const scope: 'workspace' | 'organization' = workspaceId
      ? 'workspace'
      : 'organization';
    // Base tenant filter — org always, workspace when scoped.
    const base: { organizationId: string; workspaceId?: string } = workspaceId
      ? { organizationId, workspaceId }
      : { organizationId };

    // Count pending exceptions by type
    const pending = await this.repo.count({
      where: { ...base, status: 'PENDING' },
    });

    const capacityPending = await this.repo.count({
      where: { ...base, status: 'PENDING', exceptionType: 'CAPACITY' },
    });

    const budgetPending = await this.repo.count({
      where: { ...base, status: 'PENDING', exceptionType: 'BUDGET' },
    });

    // Hard blocks in the last 7 days (GOVERNANCE_RULE = block-and-throw origin).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const hardBlocksThisWeek = await this.repo.count({
      where: {
        ...base,
        exceptionType: 'GOVERNANCE_RULE',
        createdAt: MoreThanOrEqual(sevenDaysAgo),
      },
    });

    return {
      activePolicies: pending,
      capacityWarnings: capacityPending,
      budgetWarnings: budgetPending,
      hardBlocksThisWeek,
      scope,
    };
  }
}
