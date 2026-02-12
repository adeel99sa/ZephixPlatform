import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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

/** Whitelist for sortBy: only these map to column names. Never pass raw strings into orderBy. */
const SORT_COLUMN_MAP: Record<string, string> = {
  dueDate: 'task.dueDate',
  updatedAt: 'task.updatedAt',
  createdAt: 'task.createdAt',
};

const VALID_STATUSES = new Set<string>(Object.values(TaskStatus));
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

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
};
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { DataSource, ILike, In, IsNull } from 'typeorm';
import { WorkPhase } from '../entities/work-phase.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { ProjectHealthService } from './project-health.service';
import { WipLimitsService } from './wip-limits.service';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class WorkTasksService {
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

    return { items, total, limit, offset };
  }

  async getTaskById(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    return this.getTaskInWorkspaceOrFail(workspaceId, id);
  }

  async updateTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
    dto: UpdateWorkTaskDto,
  ): Promise<WorkTask> {
    // Centralized workspace validation - always 403 WORKSPACE_REQUIRED
    await this.assertWorkspaceAccess(auth, workspaceId);
    const organizationId = this.tenantContext.assertOrganizationId();
    // Use getActiveTaskOrFail to block mutations on deleted tasks
    const task = await this.getActiveTaskOrFail(workspaceId, id);

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
    if (dto.estimateHours !== undefined) {
      // Note: estimateHours not in entity yet, skip for now
      // Will be added in future migration if needed
      changedFields.push('estimateHours');
    }
    if (dto.tags !== undefined) {
      task.tags = dto.tags;
      changedFields.push('tags');
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
        console.warn('Failed to recalculate project health:', error);
      }
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

    // Get projectIds for health recalculation (before update)
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];

    // WIP limit enforcement per project
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

    // Update all tasks
    await this.taskRepo
      .qb('task')
      .update()
      .set({ status: dto.status })
      .where('task.id IN (:...taskIds)', { taskIds: dto.taskIds })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId })
      .execute();

    // Trigger health recalculation for affected projects
    for (const projectId of projectIds) {
      try {
        await this.projectHealthService.recalculateProjectHealth(
          projectId,
          organizationId,
          workspaceId,
        );
      } catch (error) {
        console.warn('Failed to recalculate project health:', error);
      }
    }

    // Emit activity for each task
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
    // Use getActiveTaskOrFail - can't delete an already deleted task
    const task = await this.getActiveTaskOrFail(workspaceId, id);

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
}
