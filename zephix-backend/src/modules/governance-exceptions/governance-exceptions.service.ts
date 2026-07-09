import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { GovernanceException } from './entities/governance-exception.entity';
import { AuditService } from '../audit/services/audit.service';
import { AuditEntityType, AuditAction } from '../audit/audit.constants';

@Injectable()
export class GovernanceExceptionsService {
  private readonly logger = new Logger(GovernanceExceptionsService.name);

  constructor(
    @InjectRepository(GovernanceException)
    private readonly repo: Repository<GovernanceException>,
    private readonly auditService: AuditService,
  ) {}

  async create(input: {
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
  }): Promise<GovernanceException> {
    const exception = this.repo.create({
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
    const saved = await this.repo.save(exception);

    await this.auditService.recordOrThrow({
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
    });

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
