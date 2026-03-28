import {
  Injectable,
  Inject,
  Optional,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { WorkTask } from '../entities/work-task.entity';
import { WorkTaskDependency } from '../entities/task-dependency.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskActivity } from '../entities/task-activity.entity';
import { TaskActivityService } from './task-activity.service';
import {
  CreateWorkTaskDto,
  UpdateWorkTaskDto,
  ListWorkTasksQueryDto,
  BulkStatusUpdateDto,
} from '../dto';
import { TaskStatus, TaskPriority, TaskType, TaskActivityType } from '../enums/task.enums';
import {
  normalizeAcceptanceCriteria,
  validateAcceptanceCriteria,
} from '../utils/acceptance-criteria.utils';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { DataSource, ILike, In, IsNull, Repository } from 'typeorm';
import { GateCondition } from '../entities/gate-condition.entity';
import { PhaseGateDefinition } from '../entities/phase-gate-definition.entity';
import { WorkPhase } from '../entities/work-phase.entity';
import { GateConditionStatus } from '../enums/gate-condition-status.enum';
import { GateReviewState } from '../enums/gate-review-state.enum';
import { parseConditionalGoProgression } from '../constants/conditional-go.constants';
import { WorkTaskStructuralGuardService } from './work-task-structural-guard.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectHealthService } from './project-health.service';
import { WipLimitsService } from './wip-limits.service';
import { Project } from '../../projects/entities/project.entity';
import { AuditService } from '../../audit/services/audit.service';
import { AuditEntityType, AuditAction, AuditSource } from '../../audit/audit.constants';
import { GovernanceRuleEngineService, EvaluationResult } from '../../governance-rules/services/governance-rule-engine.service';
import { EvaluationDecision } from '../../governance-rules/entities/governance-evaluation.entity';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';

/** Whitelist for sortBy: only these map to column names. Never pass raw strings into orderBy. */
const SORT_COLUMN_MAP: Record<string, string> = {
  dueDate: 'task.dueDate',
  updatedAt: 'task.updatedAt',
  createdAt: 'task.createdAt',
  rank: 'task.rank', // Phase 2H: Board column ordering
};

const VALID_STATUSES = new Set<string>(Object.values(TaskStatus));
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const SEARCH_DEFAULT_LIMIT = 8;
const TERMINAL_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.DONE,
  TaskStatus.CANCELED,
];

export interface TeamWorkloadItem {
  assigneeUserId: string;
  assignedCount: number;
  overdueCount: number;
  dueSoonCount: number;
}

export interface WorkSearchResult {
  projects: Array<{ id: string; name: string; status: string }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    projectId: string;
  }>;
  comments: Array<{
    id: string;
    body: string;
    taskId: string;
    createdByUserId: string;
    createdAt: Date;
  }>;
}

function parseAndValidateStatusList(
  value: string | undefined,
  field: string,
): string[] {
  if (!value || typeof value !== 'string') return [];
  const list = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = list.filter((s) => !VALID_STATUSES.has(s));
  if (invalid.length > 0) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `Invalid status value(s) in ${field}. Allowed: ${Array.from(VALID_STATUSES).join(', ')}`,
      details: { invalid },
    });
  }
  return list;
}

/**
 * Status Transition Rules (MVP Locked)
 *
 * Terminal states: DONE, CANCELED - no transitions out
 * BLOCKED: only from TODO or IN_PROGRESS
 * IN_REVIEW: only from IN_PROGRESS
 *
 * Reject invalid transitions with 400 VALIDATION_ERROR code INVALID_STATUS_TRANSITION.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.BACKLOG]: [TaskStatus.TODO, TaskStatus.CANCELED],
  [TaskStatus.TODO]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELED,
  ],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.BLOCKED,
    TaskStatus.IN_REVIEW,
    TaskStatus.DONE,
    TaskStatus.CANCELED,
  ],
  [TaskStatus.BLOCKED]: [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELED,
  ],
  [TaskStatus.IN_REVIEW]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.DONE,
    TaskStatus.CANCELED,
  ],
  [TaskStatus.DONE]: [], // Terminal - no transitions out
  [TaskStatus.CANCELED]: [], // Terminal - no transitions out
  [TaskStatus.PENDING]: [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELED,
  ],
  [TaskStatus.REWORK]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.TODO,
    TaskStatus.DONE,
    TaskStatus.CANCELED,
  ],
};

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class WorkTasksService {
  private readonly logger = new Logger(WorkTasksService.name);

  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    @Inject(getTenantAwareRepositoryToken(WorkTaskDependency))
    private readonly dependencyRepo: TenantAwareRepository<WorkTaskDependency>,
    @Inject(getTenantAwareRepositoryToken(TaskComment))
    private readonly commentRepo: TenantAwareRepository<TaskComment>,
    @Inject(getTenantAwareRepositoryToken(TaskActivity))
    private readonly activityRepo: TenantAwareRepository<TaskActivity>,
    @InjectRepository(WorkPhase)
    private readonly workPhaseRepository: Repository<WorkPhase>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly activityService: TaskActivityService,
    private readonly tenantContext: TenantContextService,
    private readonly dataSource: DataSource,
    private readonly projectHealthService: ProjectHealthService,
    private readonly wipLimitsService: WipLimitsService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly auditService: AuditService,
    @InjectRepository(GateCondition)
    private readonly gateConditionRepo: Repository<GateCondition>,
    @InjectRepository(PhaseGateDefinition)
    private readonly phaseGateDefinitionRepo: Repository<PhaseGateDefinition>,
    private readonly structuralGuard: WorkTaskStructuralGuardService,
    @Optional()
    private readonly governanceEngine?: GovernanceRuleEngineService,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
  ) {}

  // ============================================================
  // WORKSPACE SCOPE HELPERS - Centralized tenant safety
  // ============================================================

  /**
   * Assert workspace access for the current user.
   * Always throws 403 WORKSPACE_REQUIRED if:
   * - workspaceId is missing
   * - user doesn't have access to the workspace
   * - workspace doesn't belong to user's organization
   */
  private async assertWorkspaceAccess(
    auth: AuthContext,
    workspaceId: string | undefined | null,
  ): Promise<string> {
    if (!workspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace ID is required. Include x-workspace-id header.',
      });
    }

    const organizationId = this.tenantContext.assertOrganizationId();
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      auth.userId,
      auth.platformRole,
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Access denied to workspace',
      });
    }

    return workspaceId;
  }

  /**
   * Get a task by ID with workspace scope.
   * Returns null if not found or not in workspace (404 behavior).
   * This prevents cross-tenant data access.
   */
  private async getTaskInWorkspace(
    workspaceId: string,
    taskId: string,
    includeDeleted = false,
  ): Promise<WorkTask | null> {
    const where: any = {
      id: taskId,
      workspaceId,
    };
    if (!includeDeleted) {
      where.deletedAt = IsNull();
    }
    return this.taskRepo.findOne({ where });
  }

  /**
   * Get a task by ID with workspace scope, throw 404 if not found.
   */
  private async getTaskInWorkspaceOrFail(
    workspaceId: string,
    taskId: string,
    includeDeleted = false,
  ): Promise<WorkTask> {
    const task = await this.getTaskInWorkspace(
      workspaceId,
      taskId,
      includeDeleted,
    );
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    return task;
  }

  /**
   * Get a non-deleted task for mutations. Throws 404 TASK_NOT_FOUND if deleted or not found.
   * Use this for update, comment, activity, dependency operations.
   *
   * Note: We use TASK_NOT_FOUND for both "doesn't exist" and "is deleted" cases
   * to avoid leaking existence information across workspaces and keep client logic simple.
   */
  private async getActiveTaskOrFail(
    workspaceId: string,
    taskId: string,
  ): Promise<WorkTask> {
    const task = await this.getTaskInWorkspace(workspaceId, taskId, true);
    if (!task || task.deletedAt) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    return task;
  }

  private async loadProjectAndPhaseForStructuralGuard(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    phaseId: string | null,
  ): Promise<{ project: Project; phase: WorkPhase | null }> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    let phase: WorkPhase | null = null;
    if (phaseId) {
      phase = await this.workPhaseRepository.findOne({
        where: {
          id: phaseId,
          organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
      });
    }
    return { project, phase };
  }

  /**
   * F-2: Block leaving DONE on a condition task once gate review has started.
   */
  private async assertConditionTaskMayLeaveDone(
    auth: AuthContext,
    workspaceId: string,
    sourceGateConditionId: string,
  ): Promise<void> {
    const condition = await this.gateConditionRepo.findOne({
      where: {
        id: sourceGateConditionId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      relations: ['gateCycle', 'gateCycle.phaseGateDefinition'],
    });
    const gateDef = condition?.gateCycle?.phaseGateDefinition;
    if (!gateDef) {
      return;
    }
    const rs = gateDef.reviewState;
    if (
      rs === GateReviewState.IN_REVIEW ||
      rs === GateReviewState.APPROVED ||
      rs === GateReviewState.REJECTED
    ) {
      throw new ConflictException({
        code: 'GATE_CONDITION_REVIEW_LOCKED',
        message:
          'This condition task cannot move off DONE while gate review is in progress. Use an explicit governance action.',
      });
    }
  }

  /**
   * F-2: Conditional-go bridge — GateCondition + PhaseGateDefinition.reviewState.
   */
  private async applyConditionalGoBridge(
    auth: AuthContext,
    workspaceId: string,
    task: WorkTask,
    previousStatus: TaskStatus,
    newStatus: TaskStatus,
  ): Promise<void> {
    if (!task.sourceGateConditionId || !task.isConditionTask) {
      return;
    }
    if (previousStatus === newStatus) {
      return;
    }

    const condition = await this.gateConditionRepo.findOne({
      where: {
        id: task.sourceGateConditionId,
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      relations: ['gateCycle', 'gateCycle.phaseGateDefinition'],
    });
    const gateDef = condition?.gateCycle?.phaseGateDefinition;
    if (!condition || !gateDef) {
      return;
    }

    const mode = parseConditionalGoProgression(
      gateDef.thresholds as Record<string, unknown> | null,
    );

    if (newStatus === TaskStatus.DONE) {
      condition.conditionStatus = GateConditionStatus.SATISFIED;
      await this.gateConditionRepo.save(condition);

      if (mode === 'manual') {
        return;
      }

      const all = await this.gateConditionRepo.find({
        where: {
          gateCycleId: condition.gateCycleId,
          organizationId: auth.organizationId,
          workspaceId,
          deletedAt: IsNull(),
        },
      });
      const allSatisfied = all.every(
        (c) =>
          c.conditionStatus === GateConditionStatus.SATISFIED ||
          c.conditionStatus === GateConditionStatus.WAIVED,
      );
      const terminalReview = [
        GateReviewState.IN_REVIEW,
        GateReviewState.APPROVED,
        GateReviewState.REJECTED,
      ].includes(gateDef.reviewState);
      if (
        allSatisfied &&
        !terminalReview &&
        gateDef.reviewState !== GateReviewState.READY_FOR_REVIEW
      ) {
        gateDef.reviewState = GateReviewState.READY_FOR_REVIEW;
        await this.phaseGateDefinitionRepo.save(gateDef);
      }
      return;
    }

    // newStatus cannot be DONE here (handled above); rollback path when leaving DONE.
    if (previousStatus === TaskStatus.DONE) {
      if (
        [GateReviewState.IN_REVIEW, GateReviewState.APPROVED, GateReviewState.REJECTED].includes(
          gateDef.reviewState,
        )
      ) {
        return;
      }
      condition.conditionStatus = GateConditionStatus.PENDING;
      await this.gateConditionRepo.save(condition);

      if (mode === 'manual') {
        return;
      }
      if (gateDef.reviewState === GateReviewState.READY_FOR_REVIEW) {
        gateDef.reviewState = GateReviewState.AWAITING_CONDITIONS;
        await this.phaseGateDefinitionRepo.save(gateDef);
      }
    }
  }

  // ============================================================
  // STATUS TRANSITION VALIDATION
  // ============================================================

  private assertStatusTransition(
    currentStatus: TaskStatus,
    nextStatus: TaskStatus,
  ): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${nextStatus}`,
        currentStatus,
        requestedStatus: nextStatus,
      });
    }
  }

  async createTask(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateWorkTaskDto,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Sprint 2: Auto-assign phaseId if missing
    let phaseId = dto.phaseId || null;
    if (!phaseId && dto.projectId) {
      // Find first phase by sortOrder for this project
      const firstPhase = await this.workPhaseRepository.findOne({
        where: {
          organizationId,
          workspaceId,
          projectId: dto.projectId,
          deletedAt: IsNull(),
        },
        order: {
          sortOrder: 'ASC',
        },
        select: ['id'],
      });

      if (!firstPhase) {
        throw new ConflictException({
          code: 'WORK_PLAN_INVALID',
          message: 'No phases exist for this project.',
        });
      }

      phaseId = firstPhase.id;
    } else if (phaseId) {
      // Validate explicitly provided phaseId is not deleted
      const phase = await this.workPhaseRepository.findOne({
        where: {
          id: phaseId,
          workspaceId,
          deletedAt: IsNull(),
        },
        select: ['id'],
      });
      if (!phase) {
        throw new NotFoundException({
          code: 'PHASE_NOT_FOUND',
          message: 'Phase not found',
        });
      }
    }

    // Validate acceptance criteria if provided
    let normalizedAC: Array<{ text: string; done: boolean }> | null = null;
    if (dto.acceptanceCriteria !== undefined) {
      const acError = validateAcceptanceCriteria(dto.acceptanceCriteria);
      if (acError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: acError,
        });
      }
      normalizedAC = normalizeAcceptanceCriteria(dto.acceptanceCriteria);
    }

    // C1 Fix: Estimation mode enforcement on task creation (mirrors updateTask validation)
    if (dto.estimatePoints !== undefined || dto.estimateHours !== undefined) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId, organizationId },
        select: ['id', 'estimationMode'],
      });
      const mode = project?.estimationMode || 'both';
      if (dto.estimatePoints !== undefined && mode === 'hours_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Points estimation is disabled for this project (hours_only mode)',
        });
      }
      if (dto.estimateHours !== undefined && mode === 'points_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Hours estimation is disabled for this project (points_only mode)',
        });
      }
    }

    const { project, phase } = await this.loadProjectAndPhaseForStructuralGuard(
      organizationId,
      workspaceId,
      dto.projectId,
      phaseId,
    );
    this.structuralGuard.assertTaskFieldMutationAllowed(project, phase);

    const task = this.taskRepo.create({
      organizationId,
      workspaceId,
      projectId: dto.projectId,
      phaseId,
      title: dto.title,
      description: dto.description || null,
      status: dto.status || TaskStatus.TODO,
      type: dto.type || TaskType.TASK,
      priority: dto.priority || TaskPriority.MEDIUM,
      assigneeUserId: dto.assigneeUserId || null,
      reporterUserId: dto.reporterUserId || null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      tags: dto.tags || null,
      acceptanceCriteria: normalizedAC,
      estimatePoints: dto.estimatePoints ?? null,
      estimateHours: dto.estimateHours ?? null,
      iterationId: dto.iterationId ?? null,
    });

    const saved = await this.taskRepo.save(task);

    // Emit activity
    await this.activityService.record(
      auth,
      workspaceId,
      saved.id,
      'TASK_CREATED' as any,
      {
        title: saved.title,
        status: saved.status,
        priority: saved.priority,
        projectId: saved.projectId,
      },
    );

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.TASK_CREATED, {
          workspaceId,
          organizationId,
          projectId: saved.projectId,
          entityId: saved.id,
          entityType: 'TASK',
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }

    return saved;
  }

  async listTasks(
    auth: AuthContext,
    workspaceId: string,
    query: ListWorkTasksQueryDto,
  ): Promise<{
    items: WorkTask[];
    total: number;
    limit: number;
    offset: number;
  }> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);

    const qb = this.taskRepo
      .qb('task')
      .where('task.workspaceId = :workspaceId', { workspaceId });

    // includeDeleted is internal: only admin or pm (MEMBER) may use it; others get non-deleted only
    const allowIncludeDeleted =
      auth.platformRole === 'ADMIN' || auth.platformRole === 'MEMBER';
    const includeDeleted = allowIncludeDeleted && !!query.includeDeleted;
    if (!includeDeleted) {
      qb.andWhere('task.deletedAt IS NULL');
    }

    if (query.projectId) {
      qb.andWhere('task.projectId = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    const includeStatuses = parseAndValidateStatusList(
      query.includeStatuses,
      'includeStatuses',
    );
    const excludeStatuses = parseAndValidateStatusList(
      query.excludeStatuses,
      'excludeStatuses',
    );
    if (includeStatuses.length > 0 && excludeStatuses.length > 0) {
      const overlap = includeStatuses.filter((s) =>
        excludeStatuses.includes(s),
      );
      if (overlap.length > 0) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message:
            'includeStatuses and excludeStatuses must not contain the same status',
          details: { overlap },
        });
      }
    }
    if (includeStatuses.length > 0) {
      qb.andWhere('task.status IN (:...includeStatuses)', { includeStatuses });
    }
    if (excludeStatuses.length > 0) {
      qb.andWhere('task.status NOT IN (:...excludeStatuses)', {
        excludeStatuses,
      });
    }

    if (query.dueFrom && query.dueTo) {
      if (query.dueFrom > query.dueTo) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'dueFrom must be less than or equal to dueTo',
        });
      }
    }
    if (query.dueFrom) {
      qb.andWhere('task.dueDate >= :dueFrom', {
        dueFrom: query.dueFrom,
      });
    }
    if (query.dueTo) {
      qb.andWhere('task.dueDate <= :dueTo', {
        dueTo: query.dueTo,
      });
    }

    if (query.assigneeUserId) {
      qb.andWhere('task.assigneeUserId = :assigneeUserId', {
        assigneeUserId: query.assigneeUserId,
      });
    }

    // ── Iteration & estimation filters ──────────────────────────────
    if (query.iterationId) {
      qb.andWhere('task.iterationId = :iterationId', {
        iterationId: query.iterationId,
      });
    }
    if (query.committed !== undefined) {
      qb.andWhere('task.committed = :committed', {
        committed: query.committed,
      });
    }
    if (query.hasEstimatePoints === true) {
      qb.andWhere('task.estimatePoints IS NOT NULL');
    } else if (query.hasEstimatePoints === false) {
      qb.andWhere('task.estimatePoints IS NULL');
    }
    if (query.hasEstimateHours === true) {
      qb.andWhere('task.estimateHours IS NOT NULL');
    } else if (query.hasEstimateHours === false) {
      qb.andWhere('task.estimateHours IS NULL');
    }
    if (query.backlog === true) {
      qb.andWhere('task.iterationId IS NULL');
    }

    if (query.search) {
      qb.andWhere('task.title ILIKE :search', { search: `%${query.search}%` });
    }

    const sortByKey = query.sortBy ?? 'updatedAt';
    const sortColumn = SORT_COLUMN_MAP[sortByKey] ?? SORT_COLUMN_MAP.updatedAt;
    const sortDir = (query.sortDir ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortColumn, sortDir);

    const limit = Math.min(
      Math.max(1, query.limit ?? DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const offset = Math.max(0, query.offset ?? DEFAULT_OFFSET);

    const [items, total] = await qb.take(limit).skip(offset).getManyAndCount();

    await this.attachConditionTaskSourceMetadata(auth, workspaceId, items);

    return { items, total, limit, offset };
  }

  /**
   * C-8: Resolve originating gate label for condition tasks from `gate_conditions` → cycle → definition.
   * Does not compute readiness or blocking — display metadata only.
   */
  private async attachConditionTaskSourceMetadata(
    auth: AuthContext,
    workspaceId: string,
    tasks: WorkTask[],
  ): Promise<void> {
    const condIds = [
      ...new Set(
        tasks
          .filter((t) => t.isConditionTask && t.sourceGateConditionId)
          .map((t) => t.sourceGateConditionId as string),
      ),
    ];
    if (condIds.length === 0) {
      return;
    }
    const rows = await this.gateConditionRepo.find({
      where: {
        id: In(condIds),
        organizationId: auth.organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      relations: ['gateCycle', 'gateCycle.phaseGateDefinition'],
    });
    const byId = new Map<string, GateCondition>(
      rows.map((r) => [r.id, r]),
    );
    for (const t of tasks) {
      if (!t.isConditionTask || !t.sourceGateConditionId) {
        continue;
      }
      const c = byId.get(t.sourceGateConditionId);
      const pgd = c?.gateCycle?.phaseGateDefinition;
      if (pgd) {
        t.sourceGateName = pgd.name;
        t.sourceGateDefinitionId = pgd.id;
      }
    }
  }

  async getTaskById(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const task = await this.getTaskInWorkspaceOrFail(workspaceId, id);
    await this.attachConditionTaskSourceMetadata(auth, workspaceId, [task]);
    return task;
  }

  async updateTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
    dto: UpdateWorkTaskDto,
    auditSource?: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();
    // Use getActiveTaskOrFail to block mutations on deleted tasks
    const task = await this.getActiveTaskOrFail(workspaceId, id);

    const { project, phase } = await this.loadProjectAndPhaseForStructuralGuard(
      organizationId,
      workspaceId,
      task.projectId,
      task.phaseId,
    );
    this.structuralGuard.assertTaskFieldMutationAllowed(project, phase);

    const oldStatus = task.status;
    const oldAssignee = task.assigneeUserId;
    const changedFields: string[] = [];

    // Track changes
    if (dto.title !== undefined && dto.title !== task.title) {
      task.title = dto.title;
      changedFields.push('title');
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      task.description = dto.description;
      changedFields.push('description');
    }
    if (dto.status !== undefined && dto.status !== task.status) {
      this.assertStatusTransition(task.status, dto.status);

      if (
        task.isConditionTask &&
        task.sourceGateConditionId &&
        task.status === TaskStatus.DONE &&
        dto.status !== TaskStatus.DONE
      ) {
        await this.assertConditionTaskMayLeaveDone(
          auth,
          workspaceId,
          task.sourceGateConditionId,
        );
      }

      // WIP limit enforcement
      await this.wipLimitsService.enforceWipLimitOrThrow(auth, {
        organizationId,
        workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        fromStatus: task.status,
        toStatus: dto.status,
        actorUserId: auth.userId,
        actorRole: auth.platformRole,
        override: dto.wipOverride,
        overrideReason: dto.wipOverrideReason,
      });

      // Governance rule evaluation
      if (this.governanceEngine) {
        const govResult = await this.governanceEngine.evaluateTaskStatusChange({
          organizationId,
          workspaceId,
          taskId: task.id,
          fromStatus: task.status,
          toStatus: dto.status,
          task: task as any,
          actor: {
            userId: auth.userId,
            platformRole: auth.platformRole ?? 'MEMBER',
          },
          projectId: task.projectId,
          overrideReason: (dto as any).governanceOverrideReason,
        });
        if (govResult.decision === EvaluationDecision.BLOCK) {
          throw new BadRequestException({
            code: 'GOVERNANCE_RULE_BLOCKED',
            message: 'Transition blocked by governance rules',
            evaluationId: govResult.evaluationId,
            reasons: govResult.reasons,
          });
        }
      }

      task.status = dto.status;
      changedFields.push('status');
      if (dto.status === TaskStatus.DONE && !task.completedAt) {
        task.completedAt = new Date();
      }
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      task.priority = dto.priority;
      changedFields.push('priority');
    }
    if (
      dto.assigneeUserId !== undefined &&
      dto.assigneeUserId !== task.assigneeUserId
    ) {
      task.assigneeUserId = dto.assigneeUserId;
      changedFields.push('assigneeUserId');
    }
    if (dto.startDate !== undefined) {
      task.startDate = dto.startDate ? new Date(dto.startDate) : null;
      changedFields.push('startDate');
    }
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      changedFields.push('dueDate');
    }
    // Estimation mode enforcement (C4)
    if (dto.estimatePoints !== undefined || dto.estimateHours !== undefined) {
      const project = await this.projectRepository.findOne({
        where: { id: task.projectId },
        select: ['id', 'estimationMode'],
      });
      const mode = project?.estimationMode || 'both';
      if (dto.estimatePoints !== undefined && mode === 'hours_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Points estimation is disabled for this project (hours_only mode)',
        });
      }
      if (dto.estimateHours !== undefined && mode === 'points_only') {
        throw new BadRequestException({
          code: 'ESTIMATION_MODE_VIOLATION',
          message: 'Hours estimation is disabled for this project (points_only mode)',
        });
      }
    }
    if (dto.estimatePoints !== undefined) {
      task.estimatePoints = dto.estimatePoints;
      changedFields.push('estimatePoints');
    }
    if (dto.estimateHours !== undefined) {
      task.estimateHours = dto.estimateHours;
      changedFields.push('estimateHours');
    }
    if (dto.remainingHours !== undefined) {
      task.remainingHours = dto.remainingHours;
      changedFields.push('remainingHours');
    }
    if (dto.actualHours !== undefined) {
      task.actualHours = dto.actualHours;
      changedFields.push('actualHours');
    }
    if (dto.iterationId !== undefined) {
      task.iterationId = dto.iterationId;
      changedFields.push('iterationId');
    }
    if (dto.committed !== undefined) {
      task.committed = dto.committed;
      changedFields.push('committed');
    }
    if (dto.tags !== undefined) {
      task.tags = dto.tags;
      changedFields.push('tags');
    }
    // Phase 2H: Board rank for ordering within column
    if (dto.rank !== undefined) {
      task.rank = dto.rank;
      changedFields.push('rank');
    }
    if (dto.archived !== undefined) {
      // Note: archived not in entity yet, skip for now
      // Will be added in future migration if needed
      changedFields.push('archived');
    }
    if (dto.acceptanceCriteria !== undefined) {
      const acError = validateAcceptanceCriteria(dto.acceptanceCriteria);
      if (acError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: acError,
        });
      }
      task.acceptanceCriteria = normalizeAcceptanceCriteria(dto.acceptanceCriteria);
      changedFields.push('acceptanceCriteria');
    }

    const saved = await this.taskRepo.save(task);

    if (
      saved.sourceGateConditionId &&
      saved.isConditionTask &&
      oldStatus !== saved.status
    ) {
      await this.applyConditionalGoBridge(
        auth,
        workspaceId,
        saved,
        oldStatus,
        saved.status,
      );
    }

    // Emit activities
    if (oldStatus !== saved.status) {
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        'TASK_STATUS_CHANGED' as any,
        {
          oldStatus,
          newStatus: saved.status,
        },
      );
    }

    if (oldAssignee !== saved.assigneeUserId) {
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        saved.assigneeUserId
          ? ('TASK_ASSIGNED' as any)
          : ('TASK_UNASSIGNED' as any),
        {
          from: oldAssignee,
          to: saved.assigneeUserId,
          assigneeId: saved.assigneeUserId,
        },
      );
    }

    if (changedFields.includes('acceptanceCriteria')) {
      const acItems = saved.acceptanceCriteria || [];
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        TaskActivityType.TASK_ACCEPTANCE_CRITERIA_UPDATED,
        {
          count: acItems.length,
          doneCount: acItems.filter((i) => i.done).length,
        },
      );
    }

    if (changedFields.length > 0) {
      await this.activityService.record(
        auth,
        workspaceId,
        saved.id,
        'TASK_UPDATED' as any,
        { changedFields },
      );
    }

    // Trigger health recalculation if status or dueDate changed
    const dueDateChanged =
      dto.dueDate !== undefined &&
      (dto.dueDate ? new Date(dto.dueDate).getTime() : null) !==
        (task.dueDate ? task.dueDate.getTime() : null);

    if (oldStatus !== saved.status || dueDateChanged) {
      try {
        await this.projectHealthService.recalculateProjectHealth(
          saved.projectId,
          organizationId,
          workspaceId,
        );
      } catch (error) {
        // Log but don't fail the task update if health recalculation fails
        this.logger.warn('Failed to recalculate project health:', error);
      }
    }

    // Phase 3B: Audit board moves (status/rank changes only)
    const statusChanged = changedFields.includes('status');
    const rankChanged = changedFields.includes('rank');
    if ((statusChanged || rankChanged) && !auditSource) {
      // Only emit if caller didn't already provide a source (prevents double-logging)
      const oldRank = dto.rank !== undefined ? undefined : undefined; // can't capture old rank easily
      await this.auditService.record({
        organizationId,
        workspaceId,
        actorUserId: auth.userId,
        actorPlatformRole: auth.platformRole || 'MEMBER',
        entityType: AuditEntityType.WORK_TASK,
        entityId: saved.id,
        action: AuditAction.UPDATE,
        metadata: {
          ...(statusChanged ? { oldStatus, newStatus: saved.status } : {}),
          ...(rankChanged ? { newRank: saved.rank } : {}),
          changedFields,
          source: AuditSource.BOARD,
        },
      });
    }

    // Wave 10: Emit domain events for KPI recompute
    if (this.domainEventEmitter && changedFields.length > 0) {
      const eventName = statusChanged
        ? DOMAIN_EVENTS.TASK_STATUS_CHANGED
        : DOMAIN_EVENTS.TASK_UPDATED;
      this.domainEventEmitter
        .emit(eventName, {
          workspaceId,
          organizationId,
          projectId: saved.projectId,
          entityId: saved.id,
          entityType: 'TASK',
          meta: { changedFields, oldStatus, newStatus: saved.status },
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }

    return saved;
  }

  /**
   * Bulk update status for multiple tasks.
   *
   * Behavior: STRICT mode - validates all transitions, fails entire request if any invalid.
   * This prevents backdoor creation of invalid states.
   */
  async bulkUpdateStatus(
    auth: AuthContext,
    workspaceId: string,
    dto: BulkStatusUpdateDto,
  ): Promise<{ updated: number }> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Verify all tasks exist in workspace (exclude soft-deleted)
    const tasks = await this.taskRepo.find({
      where: {
        id: In(dto.taskIds),
        workspaceId,
        deletedAt: IsNull(),
      },
    });

    if (tasks.length !== dto.taskIds.length) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'One or more tasks not found',
      });
    }

    const projectIdsUnique = [...new Set(tasks.map((t) => t.projectId))];
    const phaseIdsUnique = [
      ...new Set(tasks.map((t) => t.phaseId).filter(Boolean)),
    ] as string[];

    const projects = await this.projectRepository.find({
      where: {
        id: In(projectIdsUnique),
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
    });
    const phases =
      phaseIdsUnique.length > 0
        ? await this.workPhaseRepository.find({
            where: {
              id: In(phaseIdsUnique),
              organizationId,
              workspaceId,
              deletedAt: IsNull(),
            },
          })
        : [];
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const phaseById = new Map(phases.map((p) => [p.id, p]));

    for (const task of tasks) {
      const project = projectById.get(task.projectId);
      if (!project) {
        throw new NotFoundException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }
      const phase = task.phaseId ? phaseById.get(task.phaseId) ?? null : null;
      try {
        this.structuralGuard.assertTaskFieldMutationAllowed(project, phase);
      } catch (err) {
        if (err instanceof ConflictException) {
          const res = err.getResponse() as { code?: string; message?: string };
          throw new ConflictException({
            code: res.code ?? 'STRUCTURAL_MUTATION_BLOCKED',
            message: `Bulk update blocked for task ${task.id}: ${res.message ?? err.message}`,
            blockedTaskId: task.id,
            cause: res.code ?? 'STRUCTURAL_MUTATION_BLOCKED',
          });
        }
        throw err;
      }
    }

    // STRICT validation: check all transitions before applying any
    const invalidTransitions: Array<{
      id: string;
      from: TaskStatus;
      to: TaskStatus;
      reason: string;
    }> = [];

    for (const task of tasks) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[task.status] ?? [];
      if (!allowed.includes(dto.status)) {
        invalidTransitions.push({
          id: task.id,
          from: task.status,
          to: dto.status,
          reason: `Cannot transition from ${task.status} to ${dto.status}`,
        });
      }
    }

    if (invalidTransitions.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'One or more invalid status transitions',
        invalidTransitions,
      });
    }

    for (const task of tasks) {
      if (
        task.isConditionTask &&
        task.sourceGateConditionId &&
        task.status === TaskStatus.DONE &&
        dto.status !== TaskStatus.DONE
      ) {
        await this.assertConditionTaskMayLeaveDone(
          auth,
          workspaceId,
          task.sourceGateConditionId,
        );
      }
    }

    const projectIds = [...new Set(tasks.map((t) => t.projectId))];

    for (const pid of projectIds) {
      const projectTaskIds = tasks
        .filter((t) => t.projectId === pid)
        .map((t) => t.id);
      await this.wipLimitsService.enforceWipLimitBulkOrThrow(
        auth,
        workspaceId,
        pid,
        projectTaskIds,
        dto.status,
      );
    }

    if (this.governanceEngine) {
      for (const task of tasks) {
        if (task.status === dto.status) {
          continue;
        }
        const govResult = await this.governanceEngine.evaluateTaskStatusChange({
          organizationId,
          workspaceId,
          taskId: task.id,
          fromStatus: task.status,
          toStatus: dto.status,
          task: task as any,
          actor: {
            userId: auth.userId,
            platformRole: auth.platformRole ?? 'MEMBER',
          },
          projectId: task.projectId,
        });
        if (govResult.decision === EvaluationDecision.BLOCK) {
          throw new BadRequestException({
            code: 'GOVERNANCE_RULE_BLOCKED',
            message: `Bulk update blocked by governance rules for task ${task.id}`,
            evaluationId: govResult.evaluationId,
            reasons: govResult.reasons,
            blockedTaskId: task.id,
          });
        }
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(
        WorkTask,
        {
          id: In(dto.taskIds),
          workspaceId,
          deletedAt: IsNull(),
        },
        { status: dto.status, updatedAt: new Date() },
      );
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    for (const task of tasks) {
      if (
        task.sourceGateConditionId &&
        task.isConditionTask &&
        task.status !== dto.status
      ) {
        const merged = { ...task, status: dto.status } as WorkTask;
        await this.applyConditionalGoBridge(
          auth,
          workspaceId,
          merged,
          task.status,
          dto.status,
        );
      }
    }

    for (const projectId of projectIds) {
      try {
        await this.projectHealthService.recalculateProjectHealth(
          projectId,
          organizationId,
          workspaceId,
        );
      } catch (error) {
        this.logger.warn('Failed to recalculate project health:', error);
      }
    }

    for (const taskId of dto.taskIds) {
      await this.activityService.record(
        auth,
        workspaceId,
        taskId,
        'TASK_STATUS_CHANGED' as any,
        {
          newStatus: dto.status,
          bulkUpdate: true,
        },
      );
    }

    return { updated: dto.taskIds.length };
  }

  async deleteTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<void> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();
    // Use getActiveTaskOrFail - can't delete an already deleted task
    const task = await this.getActiveTaskOrFail(workspaceId, id);

    const { project, phase } = await this.loadProjectAndPhaseForStructuralGuard(
      organizationId,
      workspaceId,
      task.projectId,
      task.phaseId,
    );
    this.structuralGuard.assertTaskFieldMutationAllowed(project, phase);

    // Soft delete: set deletedAt and deletedByUserId; keep dependencies/comments/activities for audit
    task.deletedAt = new Date();
    task.deletedByUserId = auth.userId;
    await this.taskRepo.save(task);

    // Emit activity for audit trail
    await this.activityService.record(
      auth,
      workspaceId,
      id,
      TaskActivityType.TASK_DELETED,
      {
        title: task.title,
        projectId: task.projectId,
        deletedBy: auth.userId,
      },
    );

    // Wave 10: Emit domain event for KPI recompute
    if (this.domainEventEmitter) {
      const organizationId = this.tenantContext.assertOrganizationId();
      this.domainEventEmitter
        .emit(DOMAIN_EVENTS.TASK_DELETED, {
          workspaceId,
          organizationId,
          projectId: task.projectId,
          entityId: id,
          entityType: 'TASK',
        })
        .catch((err) => this.logger.warn(`Domain event emit failed: ${err}`));
    }
  }

  /**
   * Restore a soft-deleted task.
   * Returns 404 if task doesn't exist or is not deleted.
   */
  async restoreTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    // Get task including deleted ones
    const task = await this.getTaskInWorkspace(workspaceId, id, true);
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    if (!task.deletedAt) {
      throw new BadRequestException({
        code: 'TASK_NOT_DELETED',
        message: 'Task is not deleted',
      });
    }

    const { project, phase } = await this.loadProjectAndPhaseForStructuralGuard(
      organizationId,
      workspaceId,
      task.projectId,
      task.phaseId,
    );
    this.structuralGuard.assertTaskFieldMutationAllowed(project, phase);

    // Restore: clear deletedAt and deletedByUserId
    task.deletedAt = null;
    task.deletedByUserId = null;
    const restored = await this.taskRepo.save(task);

    // Emit activity for audit trail
    await this.activityService.record(
      auth,
      workspaceId,
      id,
      TaskActivityType.TASK_RESTORED,
      {
        title: task.title,
        projectId: task.projectId,
        restoredBy: auth.userId,
      },
    );

    return restored;
  }

  // ============================================================
  // STATS
  // ============================================================

  /**
   * Get task completion stats for workspace, optionally scoped to a project.
   *
   * Rules:
   * - Excludes deleted tasks (deletedAt IS NOT NULL)
   * - Only counts DONE as completed (CANCELED is not completed)
   * - Ratio rounded to 4 decimal places
   * - Returns ratio 0 when total is 0 (no division by zero)
   */
  async getCompletionStats(
    auth: AuthContext,
    workspaceId: string,
    projectId?: string,
  ): Promise<{ completed: number; total: number; ratio: number }> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);

    // Build where clause: workspace required, project optional
    const whereClause: any = {
      workspaceId,
      deletedAt: IsNull(),
    };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    // Count all non-deleted tasks
    const total = await this.taskRepo.count({ where: whereClause });

    // Count completed (DONE only - CANCELED is not counted as completed)
    const completed = await this.taskRepo.count({
      where: {
        ...whereClause,
        status: TaskStatus.DONE,
      },
    });

    // Ratio: 0 when total is 0, otherwise rounded to 4 decimals
    const ratio =
      total > 0 ? Math.round((completed / total) * 10000) / 10000 : 0;

    return { completed, total, ratio };
  }

  async listProjectActivity(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    limit: number = DEFAULT_LIMIT,
    offset: number = DEFAULT_OFFSET,
  ): Promise<{ items: TaskActivity[]; total: number; limit: number; offset: number }> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
        deletedAt: IsNull(),
      },
      select: ['id'],
    });

    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }

    const safeLimit = Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const safeOffset = Math.max(0, offset ?? DEFAULT_OFFSET);

    const [items, total] = await this.activityRepo.findAndCount({
      where: { organizationId, workspaceId, projectId },
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });

    return { items, total, limit: safeLimit, offset: safeOffset };
  }

  async listOverdueTasks(
    auth: AuthContext,
    workspaceId: string,
    query: {
      projectId?: string;
      assigneeUserId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ items: WorkTask[]; total: number; limit: number; offset: number }> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();

    const safeLimit = Math.min(Math.max(1, query.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const safeOffset = Math.max(0, query.offset ?? DEFAULT_OFFSET);
    const now = new Date();

    const qb = this.taskRepo
      .qb('task')
      .where('task.organizationId = :organizationId', { organizationId })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.deletedAt IS NULL')
      .andWhere(`COALESCE((task.metadata ->> 'archived')::boolean, false) = false`)
      .andWhere('task.dueDate IS NOT NULL')
      .andWhere('task.dueDate < :now', { now })
      .andWhere('task.status NOT IN (:...terminalStatuses)', {
        terminalStatuses: TERMINAL_TASK_STATUSES,
      });

    if (query.projectId) {
      qb.andWhere('task.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.assigneeUserId) {
      qb.andWhere('task.assigneeUserId = :assigneeUserId', {
        assigneeUserId: query.assigneeUserId,
      });
    }

    const [items, total] = await qb
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.updatedAt', 'DESC')
      .take(safeLimit)
      .skip(safeOffset)
      .getManyAndCount();

    return { items, total, limit: safeLimit, offset: safeOffset };
  }

  async getTeamWorkload(
    auth: AuthContext,
    workspaceId: string,
    projectId?: string,
  ): Promise<TeamWorkloadItem[]> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();
    const now = new Date();
    const dueSoon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const qb = this.taskRepo
      .qb('task')
      .select('task.assigneeUserId', 'assigneeUserId')
      .addSelect('COUNT(task.id)', 'assignedCount')
      .addSelect(
        `SUM(CASE WHEN task.dueDate < :now AND task.status NOT IN (:...terminalStatuses) THEN 1 ELSE 0 END)`,
        'overdueCount',
      )
      .addSelect(
        `SUM(CASE WHEN task.dueDate >= :now AND task.dueDate <= :dueSoon AND task.status NOT IN (:...terminalStatuses) THEN 1 ELSE 0 END)`,
        'dueSoonCount',
      )
      .where('task.organizationId = :organizationId', { organizationId })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.deletedAt IS NULL')
      .andWhere(`COALESCE((task.metadata ->> 'archived')::boolean, false) = false`)
      .andWhere('task.assigneeUserId IS NOT NULL')
      .setParameters({
        now,
        dueSoon,
        terminalStatuses: TERMINAL_TASK_STATUSES,
      });

    if (projectId) {
      qb.andWhere('task.projectId = :projectId', { projectId });
    }

    const rows = await qb
      .groupBy('task.assigneeUserId')
      .orderBy('overdueCount', 'DESC')
      .addOrderBy('assignedCount', 'DESC')
      .addOrderBy('task.assigneeUserId', 'ASC')
      .getRawMany();

    return rows.map((row: any) => ({
      assigneeUserId: String(row.assigneeUserId),
      assignedCount: Number(row.assignedCount ?? 0),
      overdueCount: Number(row.overdueCount ?? 0),
      dueSoonCount: Number(row.dueSoonCount ?? 0),
    }));
  }

  async searchWorkspace(
    auth: AuthContext,
    workspaceId: string,
    rawQuery: string,
    limit: number = SEARCH_DEFAULT_LIMIT,
  ): Promise<WorkSearchResult> {
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();
    const query = (rawQuery || '').trim();
    if (query.length < 2) {
      return { projects: [], tasks: [], comments: [] };
    }

    const safeLimit = Math.min(Math.max(1, limit), 20);
    const like = `%${query}%`;

    const [projects, tasks, comments] = await Promise.all([
      this.projectRepository.find({
        where: {
          organizationId,
          workspaceId,
          deletedAt: IsNull(),
          name: ILike(like),
        },
        select: ['id', 'name', 'status'],
        order: { updatedAt: 'DESC' },
        take: safeLimit,
      } as any),
      this.taskRepo
        .qb('task')
        .where('task.organizationId = :organizationId', { organizationId })
        .andWhere('task.workspaceId = :workspaceId', { workspaceId })
        .andWhere('task.deletedAt IS NULL')
        .andWhere(`COALESCE((task.metadata ->> 'archived')::boolean, false) = false`)
        .andWhere('task.title ILIKE :like', { like })
        .orderBy('task.updatedAt', 'DESC')
        .take(safeLimit)
        .getMany(),
      this.commentRepo.find({
        where: {
          organizationId,
          workspaceId,
          body: ILike(like),
        },
        select: ['id', 'body', 'taskId', 'createdByUserId', 'createdAt'],
        order: { createdAt: 'DESC' },
        take: safeLimit,
      }),
    ]);

    return {
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
      })),
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        taskId: comment.taskId,
        createdByUserId: comment.createdByUserId,
        createdAt: comment.createdAt,
      })),
    };
  }
}
