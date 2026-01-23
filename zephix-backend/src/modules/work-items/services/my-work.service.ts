/**
 * PHASE 7 MODULE 7.2: My Work Service
 * Returns assigned work tasks for the current user across accessible workspaces
 * Updated to use WorkTask entity instead of WorkItem
 */
import { Injectable, Inject } from '@nestjs/common';
import { In } from 'typeorm';
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
import { getAuthContext } from '../../../common/http/get-auth-context';

@Injectable()
export class MyWorkService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkTask))
    private workTaskRepository: TenantAwareRepository<WorkTask>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getMyWork(
    ctx: any,
    query: MyWorkQueryDto,
  ): Promise<MyWorkResponseDto> {
    const organizationId = this.tenantContextService.assertOrganizationId();
    const userId = ctx.userId;
    const userRole = ctx.platformRole;
    const normalizedRole = normalizePlatformRole(userRole);
    const isAdmin = normalizedRole === PlatformRole.ADMIN;

    // Get accessible workspace IDs (for scoping if no workspaceId in query)
    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        organizationId,
        userId,
        userRole,
      );

    // If no accessible workspaces, return empty
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

    // Build QueryBuilder (TypeORM uses entity property names, not DB column names)
    const qb = this.workTaskRepository
      .createQueryBuilder('wt')
      .leftJoinAndSelect('wt.project', 'project')
      .leftJoinAndSelect('project.workspace', 'workspace')
      .where('wt.organizationId = :orgId', { orgId: organizationId });

    // Workspace filter - ALWAYS enforce accessible workspaces when workspaceId missing
    if (query.workspaceId) {
      qb.andWhere('wt.workspaceId = :workspaceId', {
        workspaceId: query.workspaceId,
      });
    } else {
      // Org-wide query: MUST scope to accessible workspaces to prevent data leakage
      if (accessibleWorkspaceIds === null) {
        // Admin can see all workspaces - no filter needed
      } else if (accessibleWorkspaceIds.length === 0) {
        // No accessible workspaces - return empty (already handled above)
        return {
          version: 1,
          counts: { total: 0, overdue: 0, dueSoon7Days: 0, inProgress: 0, todo: 0, done: 0 },
          items: [],
        };
      } else {
        // Scope to accessible workspaces
        qb.andWhere('wt.workspaceId IN (:...workspaceIds)', {
          workspaceIds: accessibleWorkspaceIds,
        });
      }
    }

    // Assignee filter
    // Default: workspaceId present -> 'any', no workspaceId -> 'me' (unless admin)
    const assignee = query.assignee || (query.workspaceId ? 'any' : isAdmin ? 'any' : 'me');
    if (assignee === 'me') {
      qb.andWhere('wt.assigneeUserId = :userId', { userId });
    }
    // If assignee === 'any', no filter (show all assignees in scope)

    // Status filter
    const status = query.status || 'active';
    if (status !== 'all') {
      if (status === 'active') {
        qb.andWhere('wt.status NOT IN (:...done)', {
          done: [TaskStatus.DONE, TaskStatus.CANCELED],
        });
      } else if (status === 'completed') {
        qb.andWhere('wt.status = :done', { done: TaskStatus.DONE });
      } else if (status === 'blocked') {
        qb.andWhere('wt.status = :blocked', { blocked: TaskStatus.BLOCKED });
      } else if (status === 'at_risk') {
        // At risk: overdue tasks with 1 day grace period for timezone drift
        const now = new Date();
        const gracePeriod = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
        qb.andWhere('wt.dueDate < :gracePeriod', { gracePeriod });
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
        // At risk: overdue with 1 day grace period
        const now = new Date();
        const gracePeriod = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
        clauses.push('(wt.dueDate < :riskGracePeriod AND wt.status NOT IN (:...riskDone))');
        qb.setParameter('riskGracePeriod', gracePeriod);
        qb.setParameter('riskDone', [TaskStatus.DONE, TaskStatus.CANCELED]);
      }
      if (wantOnTrack) {
        // On track: not blocked, not overdue
        const now = new Date();
        clauses.push(
          '(wt.status != :onTrackBlocked AND (wt.dueDate IS NULL OR wt.dueDate >= :onTrackNow))',
        );
        qb.setParameter('onTrackBlocked', TaskStatus.BLOCKED);
        qb.setParameter('onTrackNow', now);
      }

      if (clauses.length > 0) {
        qb.andWhere(`(${clauses.join(' OR ')})`);
      }
    }

    // Order and limit
    qb.orderBy('wt.updatedAt', 'DESC').take(200);

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

    // Sort: overdue first, then dueDate asc, then updatedAt desc
    items.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate) : null;
      const bDue = b.dueDate ? new Date(b.dueDate) : null;

      const aOverdue = aDue && aDue < now && a.status !== 'done';
      const bOverdue = bDue && bDue < now && b.status !== 'done';

      // Overdue items first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by dueDate (ascending, nulls last)
      if (aDue && bDue) {
        return aDue.getTime() - bDue.getTime();
      }
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;

      // Finally by updatedAt (descending)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

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
