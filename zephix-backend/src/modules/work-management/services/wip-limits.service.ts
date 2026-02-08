import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  TenantAwareRepository,
  getTenantAwareRepositoryToken,
} from '../../tenancy/tenancy.module';
import { WorkTask } from '../entities/work-task.entity';
import { ProjectWorkflowConfig } from '../entities/project-workflow-config.entity';
import { TaskActivityService } from './task-activity.service';
import { WorkflowConfigService } from './workflow-config.service';
import { TaskStatus, TaskActivityType } from '../enums/task.enums';
import { IsNull } from 'typeorm';

interface AuthContext {
  organizationId: string;
  userId: string;
  platformRole?: string;
}

export interface WipEnforceArgs {
  organizationId: string;
  workspaceId: string;
  projectId: string;
  taskId: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string;
  actorRole: string | undefined;
  override?: boolean;
  overrideReason?: string;
}

/** Statuses that never block (terminal / non-WIP) */
const EXEMPT_STATUSES = new Set<string>([
  TaskStatus.DONE,
  TaskStatus.BACKLOG,
  TaskStatus.CANCELED,
]);

const ADMIN_ROLES = new Set(['ADMIN', 'OWNER']);

@Injectable()
export class WipLimitsService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    @Inject(getTenantAwareRepositoryToken(ProjectWorkflowConfig))
    private readonly configRepo: TenantAwareRepository<ProjectWorkflowConfig>,
    private readonly workflowConfigService: WorkflowConfigService,
    private readonly activityService: TaskActivityService,
  ) {}

  /**
   * Check WIP limit for a status transition. Throws if blocked.
   *
   * Call this BEFORE saving the new status.
   */
  async enforceWipLimitOrThrow(
    auth: AuthContext,
    args: WipEnforceArgs,
  ): Promise<void> {
    const {
      workspaceId,
      projectId,
      taskId,
      fromStatus,
      toStatus,
      actorRole,
      override = false,
      overrideReason,
    } = args;

    // 1. Exempt statuses never block
    if (EXEMPT_STATUSES.has(toStatus)) return;

    // 2. Same-status move — no blocking
    if (fromStatus === toStatus) return;

    // 3. Resolve effective limit
    const config = await this.configRepo.findOne({
      where: { projectId, workspaceId } as any,
    });
    const limit = this.workflowConfigService.resolveLimit(config, toStatus);
    if (limit == null) return; // no limit configured

    // 4. Count current tasks in toStatus (exclude soft-deleted, exclude the moving task)
    const currentCount = await this.taskRepo
      .qb('task')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.status = :toStatus', { toStatus })
      .andWhere('task.deletedAt IS NULL')
      .andWhere('task.id != :taskId', { taskId })
      .getCount();

    // 5. Check limit
    if (currentCount >= limit) {
      if (!override) {
        throw new BadRequestException({
          code: 'WIP_LIMIT_EXCEEDED',
          message: `WIP limit exceeded for ${toStatus}`,
          status: toStatus,
          limit,
          current: currentCount,
        });
      }

      // Override requested — only admins allowed
      if (!actorRole || !ADMIN_ROLES.has(actorRole)) {
        throw new ForbiddenException({
          code: 'WIP_OVERRIDE_FORBIDDEN',
          message: 'Only admins can override WIP limits',
        });
      }

      // Log the override
      await this.activityService.record(
        auth,
        workspaceId,
        taskId,
        TaskActivityType.TASK_WIP_OVERRIDE,
        {
          toStatus,
          limit,
          current: currentCount,
          reason: overrideReason || null,
          projectId,
        },
      );
    }
  }

  /**
   * Enforce WIP limits for a bulk status update.
   * Counts how many tasks would end up in toStatus after the move.
   */
  async enforceWipLimitBulkOrThrow(
    auth: AuthContext,
    workspaceId: string,
    projectId: string,
    taskIds: string[],
    toStatus: string,
  ): Promise<void> {
    if (EXEMPT_STATUSES.has(toStatus)) return;

    const config = await this.configRepo.findOne({
      where: { projectId, workspaceId } as any,
    });
    const limit = this.workflowConfigService.resolveLimit(config, toStatus);
    if (limit == null) return;

    // Count current tasks in toStatus excluding the ones being moved
    const currentCount = await this.taskRepo
      .qb('task')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.workspaceId = :workspaceId', { workspaceId })
      .andWhere('task.status = :toStatus', { toStatus })
      .andWhere('task.deletedAt IS NULL')
      .andWhere('task.id NOT IN (:...taskIds)', { taskIds })
      .getCount();

    // After move, count will be currentCount + taskIds.length
    const afterCount = currentCount + taskIds.length;
    if (afterCount > limit) {
      throw new BadRequestException({
        code: 'WIP_LIMIT_EXCEEDED',
        message: `WIP limit exceeded for ${toStatus}`,
        status: toStatus,
        limit,
        current: currentCount,
      });
    }
  }
}
