import { Injectable, Inject } from '@nestjs/common';
import { TenantAwareRepository, getTenantAwareRepositoryToken } from '../../tenancy/tenancy.module';
import { TaskActivity } from '../entities/task-activity.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityType } from '../enums/task.enums';
import { TenantContextService } from '../../tenancy/tenant-context.service';

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

    // If taskId provided, get projectId from task
    if (taskId) {
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      if (task) {
        projectId = task.projectId;
      }
    }

    const activity = this.activityRepo.create({
      organizationId,
      workspaceId,
      projectId: projectId || '',
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
    const [items, total] = await this.activityRepo.findAndCount({
      where: { taskId, workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }
}

