/**
 * PHASE 7 MODULE 7.2: My Work Service
 * Returns assigned work tasks for the current user across accessible workspaces
 * Updated to use WorkTask entity instead of WorkItem
 */
import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { TaskStatus } from '../../work-management/enums/task.enums';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { MyWorkResponseDto, MyWorkItemDto } from '../dto/my-work-response.dto';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { MyWorkQueryDto, resolveDateRange } from '../dto/my-work-query.dto';

@Injectable()
export class MyWorkService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private workTaskRepository: TenantAwareRepository<WorkTask>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getMyWork(ctx: any, query: MyWorkQueryDto): Promise<MyWorkResponseDto> {
    const organizationId = this.tenantContextService.assertOrganizationId();
    const userId = ctx.userId;

    const normalizedRole = normalizePlatformRole(ctx.platformRole);
    const isAdmin = normalizedRole === PlatformRole.ADMIN;
    const isViewer = normalizedRole === PlatformRole.VIEWER;

    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        organizationId,
        userId,
        ctx.platformRole,
      );

    if (
      accessibleWorkspaceIds !== null &&
      accessibleWorkspaceIds.length === 0
    ) {
      return {
        version: 1,
        counts: {
          total: 0,
          overdue: 0,
          dueSoon7Days: 0,
          inProgress: 0,
          todo: 0,
          done: 0,
        },
        items: [],
      };
    }

    // Viewer second-line defense: hard fail if assignee=any is explicitly requested
    if (isViewer && query.assignee && query.assignee !== 'me') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Viewers can only view their own assigned work',
      });
    }

    // Second-line defense
    const effectiveAssignee =
      (isViewer ? 'me' : query.assignee) ||
      (query.workspaceId ? (isAdmin ? 'any' : 'me') : isAdmin ? 'any' : 'me');

    // Critical security gap: service-side enforcement for org-wide assignee=any
    if (!isAdmin && !query.workspaceId && effectiveAssignee === 'any') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message:
          'Non-admin users cannot view all assignees without workspace scope',
      });
    }

    if (!isAdmin && query.workspaceId && effectiveAssignee === 'any') {
      const effectiveRole =
        await this.workspaceAccessService.getEffectiveWorkspaceRole({
          userId,
          orgId: organizationId,
          platformRole: normalizedRole,
          workspaceId: query.workspaceId,
        });
      if (effectiveRole !== 'workspace_owner') {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Only workspace owners can view all assignees in My Work',
        });
      }
    }

    // Validate workspaceId in service
    if (query.workspaceId && !isAdmin && accessibleWorkspaceIds !== null) {
      if (!accessibleWorkspaceIds.includes(query.workspaceId)) {
        throw new ForbiddenException({
          code: 'WORKSPACE_ACCESS_DENIED',
          message: 'Access denied to workspace',
        });
      }
    }

    const qb = this.workTaskRepository
      .createQueryBuilder('wt')
      .leftJoin('wt.project', 'project')
      .leftJoin('project.workspace', 'workspace')
      .addSelect(['project.id', 'project.name'])
      .addSelect(['workspace.id', 'workspace.name'])
      .where('wt.organizationId = :orgId', { orgId: organizationId })
      // Soft delete safety: exclude soft-deleted workspaces
      .andWhere('(workspace.deletedAt IS NULL OR workspace.id IS NULL)');

    if (query.workspaceId) {
      qb.andWhere('wt.workspaceId = :workspaceId', {
        workspaceId: query.workspaceId,
      });
    } else {
      if (accessibleWorkspaceIds !== null) {
        qb.andWhere('wt.workspaceId IN (:...workspaceIds)', {
          workspaceIds: accessibleWorkspaceIds,
        });
      }
    }

    if (effectiveAssignee === 'me') {
      qb.andWhere('wt.assigneeUserId = :userId', { userId });
    }

    const status = query.status || 'active';
    if (status !== 'all') {
      if (status === 'active') {
        qb.andWhere('wt.status NOT IN (:...done)', {
          done: [TaskStatus.DONE, TaskStatus.CANCELED],
        });
      } else if (status === 'completed') {
        qb.andWhere('wt.status IN (:...done)', {
          done: [TaskStatus.DONE, TaskStatus.CANCELED],
        });
      } else if (status === 'blocked') {
        qb.andWhere('wt.status = :blocked', { blocked: TaskStatus.BLOCKED });
      } else if (status === 'at_risk') {
        const now = new Date();
        const graceMs = 24 * 60 * 60 * 1000;
        const overdueCutoff = new Date(now.getTime() - graceMs);
        qb.andWhere('wt.dueDate IS NOT NULL');
        qb.andWhere('wt.dueDate < :overdueCutoff', { overdueCutoff });
        qb.andWhere('wt.status NOT IN (:...done)', {
          done: [TaskStatus.DONE, TaskStatus.CANCELED],
        });
      }
    }

    // Date range filter
    const { from, to } = resolveDateRange(query.dateRange);
    if (from) {
      qb.andWhere('wt.updatedAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('wt.updatedAt <= :to', { to });
    }

    // Health filter (using status and dueDate heuristics until health field exists)
    if (query.health && query.health.length > 0) {
      const wantBlocked = query.health.includes('blocked');
      const wantRisk = query.health.includes('at_risk');
      const wantOnTrack = query.health.includes('on_track');

      const clauses: string[] = [];
      if (wantBlocked) {
        clauses.push('wt.status = :blockedStatus');
        qb.setParameter('blockedStatus', TaskStatus.BLOCKED);
      }
      if (wantRisk) {
        const now = new Date();
        const graceMs = 24 * 60 * 60 * 1000;
        const overdueCutoff = new Date(now.getTime() - graceMs);
        clauses.push(
          '(wt.dueDate IS NOT NULL AND wt.dueDate < :riskCutoff AND wt.status NOT IN (:...riskDone))',
        );
        qb.setParameter('riskCutoff', overdueCutoff);
        qb.setParameter('riskDone', [TaskStatus.DONE, TaskStatus.CANCELED]);
      }
      if (wantOnTrack) {
        const now = new Date();
        clauses.push(
          '(wt.status != :onTrackBlocked AND wt.status NOT IN (:...onTrackDone) AND (wt.dueDate IS NULL OR wt.dueDate >= :onTrackNow))',
        );
        qb.setParameter('onTrackBlocked', TaskStatus.BLOCKED);
        qb.setParameter('onTrackDone', [TaskStatus.DONE, TaskStatus.CANCELED]);
        qb.setParameter('onTrackNow', now);
      }

      if (clauses.length > 0) {
        qb.andWhere(`(${clauses.join(' OR ')})`);
      }
    }

    // Order in SQL to match UI sort: overdue first, then dueDate asc (nulls last), then updatedAt desc
    // This ensures overdue tasks are not cut off by take(200) before sorting
    const nowForOrder = new Date();
    // Use string enum values to avoid driver enum casting edge cases
    const doneStatusesForOrder = ['DONE', 'CANCELED'];
    qb.orderBy(
      `CASE 
        WHEN wt.dueDate IS NOT NULL 
          AND wt.dueDate < :nowForOrder 
          AND wt.status NOT IN (:...doneStatusesForOrder) 
        THEN 0 
        ELSE 1 
      END`,
      'ASC',
    )
      .setParameter('nowForOrder', nowForOrder)
      .setParameter('doneStatusesForOrder', doneStatusesForOrder)
      .addOrderBy('wt.dueDate', 'ASC', 'NULLS LAST')
      .addOrderBy('wt.updatedAt', 'DESC')
      .take(200);

    const workTasks = await qb.getMany();

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Helper to map TaskStatus enum to response format
    const mapStatus = (status: TaskStatus): string => {
      switch (status) {
        case TaskStatus.DONE:
        case TaskStatus.CANCELED:
          return 'done';
        case TaskStatus.IN_PROGRESS:
        case TaskStatus.IN_REVIEW:
        case TaskStatus.BLOCKED:
          return 'in_progress';
        case TaskStatus.TODO:
        case TaskStatus.BACKLOG:
        default:
          return 'todo';
      }
    };

    // Helper to check if status is "done" for filtering
    const isDoneStatus = (status: TaskStatus): boolean => {
      return status === TaskStatus.DONE || status === TaskStatus.CANCELED;
    };

    // Calculate counts
    let overdue = 0;
    let dueSoon7Days = 0;
    let inProgress = 0;
    let todo = 0;
    let done = 0;

    const items: MyWorkItemDto[] = [];

    for (const task of workTasks) {
      const mappedStatus = mapStatus(task.status);

      // Count by status
      if (mappedStatus === 'done') {
        done++;
      } else if (mappedStatus === 'in_progress') {
        inProgress++;
      } else if (mappedStatus === 'todo') {
        todo++;
      }

      // Check overdue (dueDate < now AND status != DONE)
      // Note: This uses a stricter cutoff than at_risk filter (which uses now - 1 day grace).
      // This means some overdue tasks from the last 24 hours will count as overdue
      // but will not appear in at_risk filter results.
      const isOverdue =
        task.dueDate &&
        new Date(task.dueDate) < now &&
        !isDoneStatus(task.status);

      if (isOverdue) {
        overdue++;
      }

      // Check due soon (dueDate within 7 days AND status != DONE)
      if (
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= sevenDaysFromNow &&
        !isDoneStatus(task.status)
      ) {
        dueSoon7Days++;
      }

      // Build item DTO
      items.push({
        id: task.id,
        title: task.title,
        status: mappedStatus,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        updatedAt: task.updatedAt.toISOString(),
        projectId: task.projectId,
        projectName: task.project?.name || 'Unknown Project',
        workspaceId: task.workspaceId,
        workspaceName: task.project?.workspace?.name || 'Unknown Workspace',
      });
    }

    // Items are already sorted in SQL (overdue first, then dueDate asc, then updatedAt desc)
    // No need for in-memory sorting

    return {
      version: 1,
      counts: {
        total: items.length,
        overdue,
        dueSoon7Days,
        inProgress,
        todo,
        done,
      },
      items,
    };
  }
}
