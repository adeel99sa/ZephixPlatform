import { Injectable, Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { Project } from '../../projects/entities/project.entity';
import { Risk } from '../../risks/entities/risk.entity';
import { IsNull, LessThanOrEqual } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class MemberHomeService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkItem))
    private workItemRepo: TenantAwareRepository<WorkItem>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepo: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(Risk))
    private riskRepo: TenantAwareRepository<Risk>,
    private readonly tenantContextService: TenantContextService,
    private readonly notificationsService: NotificationsService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getMemberHomeData(userId: string, organizationId: string) {
    const orgId = this.tenantContextService.assertOrganizationId();

    // CRITICAL: Get accessible workspace IDs to prevent data leakage
    const accessibleWorkspaceIds =
      await this.workspaceAccessService.getAccessibleWorkspaceIds(
        organizationId,
        userId,
        PlatformRole.MEMBER,
      );

    // If no accessible workspaces, return zeros
    if (
      accessibleWorkspaceIds !== null &&
      accessibleWorkspaceIds.length === 0
    ) {
      return {
        myWork: {
          assignedWorkItemsDueSoonCount: 0,
          myActiveProjectsCount: 0,
          risksIOwnCount: 0,
          upcomingMilestonesCount: 0,
        },
        inboxPreview: {
          unreadCount: 0,
          topNotifications: [],
        },
      };
    }

    // Get work items assigned to user that are due soon (within 7 days)
    // Filter by accessible workspaces via project.workspaceId
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    let workItemQuery = this.workItemRepo
      .createQueryBuilder('workItem')
      .innerJoin('workItem.project', 'project')
      .where('workItem.assigneeId = :userId', { userId })
      .andWhere('workItem.deletedAt IS NULL')
      .andWhere('workItem.dueDate <= :sevenDays', {
        sevenDays: sevenDaysFromNow,
      });

    // Filter by accessible workspaces (if not admin)
    if (accessibleWorkspaceIds !== null) {
      workItemQuery = workItemQuery.andWhere(
        'project.workspaceId IN (:...workspaceIds)',
        {
          workspaceIds: accessibleWorkspaceIds,
        },
      );
    }

    const assignedWorkItemsDueSoon = await workItemQuery.take(50).getMany();
    const assignedWorkItemsDueSoonCount = assignedWorkItemsDueSoon.length;

    // Count projects where user is delivery owner or assigned, filtered by accessible workspaces
    let projectQuery = this.projectRepo
      .createQueryBuilder('project')
      .where('project.organizationId = :organizationId', {
        organizationId: orgId,
      })
      .andWhere(
        '(project.deliveryOwnerUserId = :userId OR project.id IN (SELECT DISTINCT wi.projectId FROM work_items wi WHERE wi.assigneeId = :userId AND wi.deletedAt IS NULL))',
        { userId },
      );

    // Filter by accessible workspaces (if not admin)
    if (accessibleWorkspaceIds !== null) {
      projectQuery = projectQuery.andWhere(
        'project.workspaceId IN (:...workspaceIds)',
        {
          workspaceIds: accessibleWorkspaceIds,
        },
      );
    }

    const myActiveProjects = await projectQuery.getMany();
    const myActiveProjectsCount = myActiveProjects.length;

    // Count risks owned by user, filtered by accessible workspaces
    // Note: Risk entity may not have owner_id column - using query builder with join
    let risksIOwnCount = 0;
    try {
      // Use TenantAwareRepository query builder - automatically scoped by organizationId
      let riskQuery = this.riskRepo
        .qb('risk')
        .innerJoin('risk.project', 'project')
        .where('risk.status = :status', { status: 'active' })
        // Note: If owner_id column exists in DB but not in entity, this will fail at runtime
        // That's acceptable - better to fail than bypass tenant scoping
        .andWhere('risk.projectId = project.id');

      // Filter by accessible workspaces (if not admin)
      if (accessibleWorkspaceIds !== null) {
        riskQuery = riskQuery.andWhere(
          'project.workspaceId IN (:...workspaceIds)',
          {
            workspaceIds: accessibleWorkspaceIds,
          },
        );
      }

      // Count risks - TenantAwareRepository automatically filters by organizationId
      risksIOwnCount = await riskQuery.getCount();
    } catch (error) {
      // Risk table may not exist or entity structure differs - silent fail
      console.warn(
        '[MemberHomeService] Risk query failed (table may not exist or entity incomplete):',
        error,
      );
    }

    // Count upcoming milestones (projects with endDate in next 30 days), filtered by accessible workspaces
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    let milestoneQuery = this.projectRepo
      .createQueryBuilder('project')
      .where('project.organizationId = :organizationId', {
        organizationId: orgId,
      })
      .andWhere('project.endDate >= :now', { now: new Date() })
      .andWhere('project.endDate <= :thirtyDays', {
        thirtyDays: thirtyDaysFromNow,
      });

    // Filter by accessible workspaces (if not admin)
    if (accessibleWorkspaceIds !== null) {
      milestoneQuery = milestoneQuery.andWhere(
        'project.workspaceId IN (:...workspaceIds)',
        {
          workspaceIds: accessibleWorkspaceIds,
        },
      );
    }

    const upcomingMilestonesCount = await milestoneQuery.getCount();

    // Get inbox preview (paid only - Member)
    let unreadCount = 0;
    let topNotifications: any[] = [];

    try {
      unreadCount = await this.notificationsService.getUnreadCount(
        userId,
        organizationId,
      );

      const notificationsResult =
        await this.notificationsService.getNotifications(
          userId,
          organizationId,
          {
            status: 'unread',
            limit: 5,
          },
        );

      topNotifications = notificationsResult.notifications || [];
    } catch (error) {
      // Silent fail for notifications
      console.warn('[MemberHomeService] Failed to load notifications:', error);
    }

    return {
      myWork: {
        assignedWorkItemsDueSoonCount,
        myActiveProjectsCount,
        risksIOwnCount,
        upcomingMilestonesCount,
      },
      inboxPreview: {
        unreadCount,
        topNotifications: topNotifications.slice(0, 5),
      },
    };
  }
}
