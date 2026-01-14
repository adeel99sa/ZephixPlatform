import { Injectable, Inject } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Project } from '../../projects/entities/project.entity';
import { IsNull, LessThan } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AdminHomeService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private workspaceRepo: TenantAwareRepository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepo: TenantAwareRepository<Project>,
    private readonly tenantContextService: TenantContextService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAdminHomeData(userId: string, organizationId: string) {
    const orgId = this.tenantContextService.assertOrganizationId();

    // Count active workspaces (not deleted)
    const activeWorkspacesCount = await this.workspaceRepo.count({
      where: {
        deletedAt: IsNull(),
      },
    });

    // Count active projects (Project entity doesn't have deletedAt - count all)
    const activeProjectsCount = await this.projectRepo.count();

    // Count at-risk projects (projects with riskLevel HIGH or CRITICAL)
    const atRiskProjects = await this.projectRepo.find({
      select: ['id', 'riskLevel'],
    });
    const atRiskProjectsCount = atRiskProjects.filter(
      (p) => p.riskLevel === 'high' || p.riskLevel === 'critical',
    ).length;

    // Get inbox preview (paid only - Admin)
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
      // Silent fail for notifications - not critical for home page
      console.warn('[AdminHomeService] Failed to load notifications:', error);
    }

    return {
      organizationSummary: {
        activeWorkspacesCount,
        activeProjectsCount,
        atRiskProjectsCount,
      },
      adminActions: {
        canCreateWorkspace: true,
        canManageWorkspaces: true,
      },
      inboxPreview: {
        unreadCount,
        topNotifications: topNotifications.slice(0, 5),
      },
    };
  }
}
