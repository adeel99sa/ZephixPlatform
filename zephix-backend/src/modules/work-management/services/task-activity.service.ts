import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { TaskActivity } from '../entities/task-activity.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityType } from '../enums/task.enums';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { IsNull } from 'typeorm';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class TaskActivityService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(TaskActivity))
    private readonly activityRepo: TenantAwareRepository<TaskActivity>,
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async record(
    auth: AuthContext,
    workspaceId: string,
    taskId: string | null,
    activityType: TaskActivityType,
    metadata?: Record<string, any>,
  ): Promise<TaskActivity> {
    const organizationId = this.tenantContext.assertOrganizationId();
    let projectId: string | null = null;

    // If taskId provided, get projectId from task (include soft-deleted)
    if (taskId) {
      const task = await this.taskRepo.findOne({ where: { id: taskId } as any });
      if (task) {
        projectId = task.projectId;
      }
    }

    // Fallback: use projectId from metadata if task lookup failed
    if (!projectId && metadata?.projectId) {
      projectId = metadata.projectId;
    }

    // projectId is required (non-nullable UUID) — skip recording if missing
    if (!projectId) {
      console.warn(
        `[TaskActivity] Skipping activity record: no projectId for task=${taskId} type=${activityType}`,
      );
      return null as any;
    }

    const activity = this.activityRepo.create({
      organizationId,
      workspaceId,
      projectId,
      taskId,
      type: activityType,
      actorUserId: auth.userId,
      payload: metadata || null,
    });

    return await this.activityRepo.save(activity);
  }

  async list(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: TaskActivity[]; total: number }> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, workspaceId, deletedAt: IsNull() },
      select: ['id'],
    });
    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    const [items, total] = await this.activityRepo.findAndCount({
      where: { taskId, workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }
}
