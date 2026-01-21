import { Injectable, Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkItem } from '../../work-items/entities/work-item.entity';
import { Project } from '../../projects/entities/project.entity';
import { IsNull, LessThanOrEqual } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class MemberHomeService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkItem))
    private workItemRepo: TenantAwareRepository<WorkItem>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepo: TenantAwareRepository<Project>,
    private readonly tenantContextService: TenantContextService,
    private readonly notificationsService: NotificationsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    let risksIOwnCount = 0;
    try {
      let riskQuery = `
        SELECT COUNT(*) as count
        FROM risks r
        INNER JOIN projects p ON r.project_id = p.id
        WHERE p.organization_id = $1
        AND r.owner_id = $2
        AND r.deleted_at IS NULL
        AND r.status = 'active'
      `;
      const riskParams: any[] = [organizationId, userId];

      // Filter by accessible workspaces (if not admin)
      if (accessibleWorkspaceIds !== null) {
        riskQuery += ` AND p.workspace_id = ANY($3::uuid[])`;
        riskParams.push(accessibleWorkspaceIds);
      }

      const riskCount = await this.dataSource.query(riskQuery, riskParams);
      risksIOwnCount = parseInt(riskCount[0]?.count || '0', 10);
    } catch (error) {
      // Risk table may not exist - silent fail
      console.warn(
        '[MemberHomeService] Risk query failed (table may not exist):',
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
