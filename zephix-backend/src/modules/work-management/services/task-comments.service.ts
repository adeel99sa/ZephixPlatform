import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { TaskComment } from '../entities/task-comment.entity';
import { WorkTask } from '../entities/work-task.entity';
import { TaskActivityService } from './task-activity.service';
import { AddCommentDto } from '../dto/add-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { IsNull } from 'typeorm';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import { normalizeWorkspaceRole, WorkspaceRole } from '../../workspaces/entities/workspace.entity';
import { isAdminRole } from '../../../shared/enums/platform-roles.enum';

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
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  private async getActiveTaskOrFail(
    workspaceId: string,
    taskId: string,
  ): Promise<WorkTask> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, workspaceId, deletedAt: IsNull() },
    });

    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }

    return task;
  }

  private async getCommentOrFail(
    workspaceId: string,
    taskId: string,
    commentId: string,
  ): Promise<TaskComment> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, taskId, workspaceId },
    });

    if (!comment) {
      throw new NotFoundException({
        code: 'TASK_COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    return comment;
  }

  private async assertCanManageComment(
    auth: AuthContext,
    workspaceId: string,
    comment: TaskComment,
  ): Promise<void> {
    if (comment.createdByUserId === auth.userId) {
      return;
    }

    if (isAdminRole(auth.platformRole)) {
      return;
    }

    const role = normalizeWorkspaceRole(
      await this.workspaceRoleGuard.getWorkspaceRole(workspaceId, auth.userId),
    );
    const elevatedRoles: WorkspaceRole[] = ['workspace_admin', 'delivery_owner'];
    if (role && elevatedRoles.includes(role)) {
      return;
    }

    throw new ForbiddenException({
      code: 'TASK_COMMENT_FORBIDDEN',
      message: 'Not allowed to modify this comment',
    });
  }

  async addComment(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
    dto: AddCommentDto,
  ): Promise<TaskComment> {
    const organizationId = this.tenantContext.assertOrganizationId();
    await this.getActiveTaskOrFail(workspaceId, taskId);

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
    await this.getActiveTaskOrFail(workspaceId, taskId);

    const [items, total] = await this.commentRepo.findAndCount({
      where: { taskId, workspaceId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }

  async updateComment(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
    commentId: string,
    dto: UpdateCommentDto,
  ): Promise<TaskComment> {
    await this.getActiveTaskOrFail(workspaceId, taskId);
    const comment = await this.getCommentOrFail(workspaceId, taskId, commentId);
    await this.assertCanManageComment(auth, workspaceId, comment);

    comment.body = dto.body;
    comment.updatedByUserId = auth.userId;
    const saved = await this.commentRepo.save(comment);

    await this.activityService.record(
      auth,
      workspaceId,
      taskId,
      'TASK_COMMENT_EDITED' as any,
      { commentId: saved.id },
    );

    return saved;
  }

  async deleteComment(
    auth: AuthContext,
    workspaceId: string,
    taskId: string,
    commentId: string,
  ): Promise<void> {
    await this.getActiveTaskOrFail(workspaceId, taskId);
    const comment = await this.getCommentOrFail(workspaceId, taskId, commentId);
    await this.assertCanManageComment(auth, workspaceId, comment);

    await this.commentRepo.delete({ id: commentId, taskId, workspaceId } as any);

    await this.activityService.record(
      auth,
      workspaceId,
      taskId,
      'TASK_COMMENT_DELETED' as any,
      { commentId },
    );
  }
}
