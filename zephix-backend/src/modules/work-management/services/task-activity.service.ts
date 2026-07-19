import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
  private readonly logger = new Logger(TaskActivityService.name);
  // GATE-RECEIPT-1: last-warned timestamp per activity type, to throttle the
  // dropped-receipt WARN (loud but not spammy).
  private readonly receiptDropWarnAt = new Map<string, number>();
  private static readonly RECEIPT_DROP_WARN_THROTTLE_MS = 60_000;

  /**
   * A receipt could not be written (no resolvable projectId). This is a governance/
   * activity record failing to persist while the underlying action commits — it
   * must be visible. Named prefix so it is greppable in logs; throttled per type.
   */
  private warnReceiptDropped(
    activityType: TaskActivityType,
    taskId: string | null,
  ): void {
    const now = Date.now();
    const last = this.receiptDropWarnAt.get(activityType) ?? 0;
    if (now - last < TaskActivityService.RECEIPT_DROP_WARN_THROTTLE_MS) return;
    this.receiptDropWarnAt.set(activityType, now);
    this.logger.warn(
      `[RECEIPT-DROP] activity receipt NOT written — no resolvable projectId ` +
        `(type=${activityType} task=${taskId ?? 'null'}). The action committed but ` +
        `its receipt did not. A project-scoped caller must supply projectId.`,
    );
  }

  constructor(
    @Inject(getTenantAwareRepositoryToken(TaskActivity))
    private readonly activityRepo: TenantAwareRepository<TaskActivity>,
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private readonly taskRepo: TenantAwareRepository<WorkTask>,
    private readonly tenantContext: TenantContextService,
    private readonly eventEmitter: EventEmitter2,
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

    // GATE-RECEIPT-1: projectId is required (non-nullable column) so the write
    // is still skipped when it is missing — BUT a dropped receipt must be
    // VISIBLE, not silent. The decision/action commits regardless, so a silently
    // dropped receipt is a governance record vanishing (the class of bug this
    // fixes). Callers that are always project-scoped (gate receipts) now supply
    // projectId so this never fires; if it ever does, it is loud + named +
    // throttled per type.
    if (!projectId) {
      this.warnReceiptDropped(activityType, taskId);
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

    const saved = await this.activityRepo.save(activity);

    this.eventEmitter.emit('activity.recorded', {
      activityId: saved.id,
      organizationId: saved.organizationId,
      workspaceId: saved.workspaceId,
      projectId: saved.projectId,
      taskId: saved.taskId,
      type: saved.type,
      actorUserId: saved.actorUserId,
      payload: saved.payload,
    });

    return saved;
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
