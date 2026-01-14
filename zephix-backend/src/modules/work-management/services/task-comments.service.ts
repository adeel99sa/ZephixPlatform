import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { TaskComment } from '../entities/task-comment.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { AddCommentDto } from '../dto/add-comment.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

@Injectable()
export class TaskCommentsService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(TaskComment))
    private readonly commentRepo: TenantAwareRepository<TaskComment>,
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    private readonly activityService: TaskActivityService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async addComment(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
    dto: AddCommentDto,
  ): Promise<TaskComment> {
    const organizationId = this.tenantContext.assertOrganizationId();

    // Validate task exists
    const task = await this.taskRepo.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    const comment = this.commentRepo.create({
      organizationId,
      workspaceId,
      taskId,
      body: dto.body,
      createdByUserId: auth.userId,
    });

    const saved = await this.commentRepo.save(comment);

    // Emit activity
    await this.activityService.record(
      auth,
      workspaceId,
      taskId,
      'TASK_COMMENT_ADDED' as any,
      { commentId: saved.id },
    );

    return saved;
  }

  async listComments(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: TaskComment[]; total: number }> {
    const [items, total] = await this.commentRepo.findAndCount({
      where: { taskId, workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }
}
