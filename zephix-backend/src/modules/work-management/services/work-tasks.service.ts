import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantAwareRepository, getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
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
import { TaskStatus, TaskPriority, TaskType } from '../enums/task.enums';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { DataSource, ILike, In } from 'typeorm';

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
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly activityService: TaskActivityService,
    private readonly tenantContext: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  async createTask(
    auth: AuthContext,
    workspaceId: string,
    dto: CreateWorkTaskDto,
  ): Promise<WorkTask> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    const task = this.taskRepo.create({
      organizationId,
      workspaceId,
      projectId: dto.projectId,
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
  ): Promise<{ items: WorkTask[]; total: number }> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    const qb = this.taskRepo
      .qb('task')
      .where('task.workspaceId = :workspaceId', { workspaceId });

    if (query.projectId) {
      qb.andWhere('task.projectId = :projectId', { projectId: query.projectId });
    }

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (query.assigneeUserId) {
      qb.andWhere('task.assigneeUserId = :assigneeUserId', {
        assigneeUserId: query.assigneeUserId,
      });
    }

    if (query.search) {
      qb.andWhere('task.title ILIKE :search', { search: `%${query.search}%` });
    }

    if (!query.includeArchived) {
      // Assuming archived is a boolean field, if not present, skip this filter
      // For now, we'll skip archived filter if field doesn't exist
    }

    const limit = Math.min(query.limit || 50, 200);
    const offset = query.offset || 0;

    const [items, total] = await qb
      .orderBy('task.updatedAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { items, total };
  }

  async getTaskById(
    auth: AuthContext,
    workspaceId: string,
    id: string,
  ): Promise<WorkTask> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    const task = await this.taskRepo.findOne({
      where: { id, workspaceId },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    return task;
  }

  async updateTask(
    auth: AuthContext,
    workspaceId: string,
    id: string,
    dto: UpdateWorkTaskDto,
  ): Promise<WorkTask> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    const task = await this.taskRepo.findOne({
      where: { id, workspaceId },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

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
    if (dto.assigneeUserId !== undefined && dto.assigneeUserId !== task.assigneeUserId) {
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
        saved.assigneeUserId ? ('TASK_ASSIGNED' as any) : ('TASK_UNASSIGNED' as any),
        {
          from: oldAssignee,
          to: saved.assigneeUserId,
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

    return saved;
  }

  async bulkUpdateStatus(
    auth: AuthContext,
    workspaceId: string,
    dto: BulkStatusUpdateDto,
  ): Promise<{ updated: number }> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    // Verify all tasks exist in workspace
    const tasks = await this.taskRepo.find({
      where: {
        id: In(dto.taskIds),
        workspaceId,
      },
    });

    if (tasks.length !== dto.taskIds.length) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'One or more tasks not found',
      });
    }

    // Update all tasks
    await this.taskRepo
      .qb('task')
      .update()
      .set({ status: dto.status })
      .where('task.id IN (:...taskIds)', { taskIds: dto.taskIds })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId })
      .execute();

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
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate workspace access
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

    const task = await this.taskRepo.findOne({
      where: { id, workspaceId },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    const taskTitle = task.title;

    // Use transaction to ensure cascade deletes
    await this.dataSource.transaction(async (manager) => {
      // Delete dependencies (CASCADE should handle this, but explicit for safety)
      await manager.delete(WorkTaskDependency, {
        predecessorTaskId: id,
      });
      await manager.delete(WorkTaskDependency, {
        successorTaskId: id,
      });

      // Delete comments (CASCADE should handle this)
      await manager.delete(TaskComment, {
        taskId: id,
      });

      // Delete activities (SET NULL should handle this, but we'll delete explicitly)
      await manager.delete(TaskActivity, {
        taskId: id,
      });

      // Delete task
      await manager.delete(WorkTask, {
        id,
      });
    });
  }
}

