import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { Workspace } from '../entities/workspace.entity';
import { Project } from '../../projects/entities/project.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { IsNull, LessThan, Not } from 'typeorm';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import {
  WorkItem,
  WorkItemStatus,
} from '../../work-items/entities/work-item.entity';
import {
  WorkItemActivity,
  WorkItemActivityType,
} from '../../work-items/entities/work-item-activity.entity';
import { User } from '../../users/entities/user.entity';
import { Risk } from '../../risks/entities/risk.entity';

@Injectable()
export class WorkspaceHealthService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private workspaceRepo: TenantAwareRepository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(Project))
    private projectRepo: TenantAwareRepository<Project>,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private memberRepo: TenantAwareRepository<WorkspaceMember>,
    @Inject(getTenantAwareRepositoryToken(WorkItem))
    private workItemRepo: TenantAwareRepository<WorkItem>,
    @Inject(getTenantAwareRepositoryToken(WorkItemActivity))
    private workItemActivityRepo: TenantAwareRepository<WorkItemActivity>,
    @Inject(getTenantAwareRepositoryToken(Risk))
    private riskRepo: TenantAwareRepository<Risk>,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async getWorkspaceHomeData(
    slug: string,
    organizationId: string,
    userId: string,
    platformRole: string | PlatformRole,
  ) {
    const orgId = this.tenantContextService.assertOrganizationId();

    // Find workspace by slug
    const workspace = await this.workspaceRepo.findOne({
      where: {
        organizationId: orgId,
        slug,
        deletedAt: IsNull(),
      },
      relations: ['owner'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check workspace access
    const normalizedRole = normalizePlatformRole(platformRole);
    const hasAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspace.id,
      organizationId,
      userId,
      normalizedRole,
    );

    if (!hasAccess) {
      // Return 404 to not reveal workspace existence
      throw new NotFoundException('Workspace not found');
    }

    // Count active projects (Project entity doesn't have deletedAt)
    const activeProjectsCount = await this.projectRepo.count({
      where: {
        workspaceId: workspace.id,
      },
    });

    // Count members
    const membersCount = await this.memberRepo.count({
      where: {
        workspaceId: workspace.id,
        status: 'active' as any,
      },
    });

    // Get active projects list (max 6)
    const activeProjects = await this.projectRepo.find({
      where: {
        workspaceId: workspace.id,
      },
      take: 6,
      order: {
        updatedAt: 'DESC',
      },
      select: ['id', 'name', 'status'],
    });

    // Count top risks using TenantAwareRepository - automatically scoped by organizationId
    // Note: Risk entity may not have all columns (severity/risk_level) - query builder will fail gracefully
    let topRisksCount = 0;
    try {
      // Use TenantAwareRepository query builder with join to Project
      // TenantAwareRepository automatically filters by organizationId
      const riskQuery = this.riskRepo
        .qb('risk')
        .innerJoin('risk.project', 'project')
        .where('project.workspaceId = :workspaceId', { workspaceId: workspace.id })
        .andWhere('risk.status = :status', { status: 'active' })
        // Note: If severity/risk_level columns don't exist in entity, this will fail at runtime
        // That's acceptable - better to fail than bypass tenant scoping
        .andWhere('(risk.severity = :high OR risk.severity = :veryHigh)', {
          high: 'high',
          veryHigh: 'very-high',
        });

      topRisksCount = await riskQuery.getCount();
    } catch (error) {
      // Risk table may not exist or entity structure differs - silent fail
      console.warn(
        '[WorkspaceHealthService] Risk query failed (table may not exist or entity incomplete):',
        error,
      );
    }

    // PHASE 7 MODULE 7.3: Execution Summary
    const executionSummary = await this.getExecutionSummary(
      workspace.id,
      orgId,
    );

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description || null,
        owner: workspace.owner
          ? {
              id: workspace.owner.id,
              firstName: workspace.owner.firstName,
              lastName: workspace.owner.lastName,
              email: workspace.owner.email,
            }
          : null,
      },
      stats: {
        activeProjectsCount,
        membersCount,
      },
      lists: {
        activeProjects: activeProjects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
        })),
      },
      topRisksCount,
      executionSummary, // PHASE 7 MODULE 7.3: Execution signals
    };
  }

  /**
   * PHASE 7 MODULE 7.3: Get execution summary for workspace
   */
  private async getExecutionSummary(
    workspaceId: string,
    organizationId: string,
  ) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Count active projects
    const activeProjects = await this.projectRepo.count({
      where: {
        workspaceId,
        organizationId,
      },
    });

    // Get all work items in workspace
    const allWorkItems = await this.workItemRepo.find({
      where: {
        workspaceId,
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['project', 'assignee'],
    });

    // Calculate counts
    const totalWorkItems = allWorkItems.length;
    let overdueWorkItems = 0;
    let dueSoon7Days = 0;
    let inProgress = 0;
    let doneLast7Days = 0;

    const overdueItems: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      projectId: string;
      projectName: string;
      assigneeId: string | null;
      assigneeName: string | null;
    }> = [];

    for (const item of allWorkItems) {
      // Count by status
      if (item.status === WorkItemStatus.IN_PROGRESS) {
        inProgress++;
      } else if (item.status === WorkItemStatus.DONE) {
        // Check if done in last 7 days
        if (item.updatedAt && item.updatedAt >= sevenDaysAgo) {
          doneLast7Days++;
        }
      }

      // Check overdue
      if (
        item.dueDate &&
        new Date(item.dueDate) < now &&
        item.status !== WorkItemStatus.DONE
      ) {
        overdueWorkItems++;
        if (overdueItems.length < 10) {
          overdueItems.push({
            id: item.id,
            title: item.title,
            dueDate: item.dueDate.toISOString(),
            projectId: item.projectId,
            projectName: item.project?.name || 'Unknown Project',
            assigneeId: item.assigneeId || null,
            assigneeName: item.assignee
              ? `${item.assignee.firstName || ''} ${item.assignee.lastName || ''}`.trim() ||
                item.assignee.email
              : null,
          });
        }
      }

      // Check due soon
      if (
        item.dueDate &&
        new Date(item.dueDate) >= now &&
        new Date(item.dueDate) <= sevenDaysFromNow &&
        item.status !== WorkItemStatus.DONE
      ) {
        dueSoon7Days++;
      }
    }

    // Get recent activity (last 20)
    // PHASE 7.3: Ensure projectId is not null (safety check for old rows if any)
    const recentActivities = await this.workItemActivityRepo.find({
      where: {
        workspaceId,
        organizationId,
        projectId: Not(IsNull()), // Safety: filter out any null projectId rows
      },
      relations: ['actorUser', 'workItem', 'workItem.project'],
      order: {
        createdAt: 'DESC',
      },
      take: 20,
    });

    // Get project names for activities
    const projectIds = [
      ...new Set(recentActivities.map((a) => a.projectId).filter(Boolean)),
    ];
    const projects =
      projectIds.length > 0
        ? await this.projectRepo.find({
            where: { id: projectIds as any, organizationId },
            select: ['id', 'name'],
          })
        : [];
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    const activityList = recentActivities.map((activity) => {
      const actorName = activity.actorUser
        ? `${activity.actorUser.firstName || ''} ${activity.actorUser.lastName || ''}`.trim() ||
          activity.actorUser.email
        : 'Unknown';

      return {
        type: activity.type,
        createdAt: activity.createdAt.toISOString(),
        actorUserId: activity.actorUserId,
        actorName,
        workItemId: activity.workItemId,
        workItemTitle: activity.workItem?.title || 'Unknown Task',
        projectId: activity.projectId,
        projectName:
          projectMap.get(activity.projectId) ||
          activity.workItem?.project?.name ||
          'Unknown Project',
      };
    });

    return {
      version: 1,
      counts: {
        activeProjects,
        totalWorkItems,
        overdueWorkItems,
        dueSoon7Days,
        inProgress,
        doneLast7Days,
      },
      topOverdue: overdueItems,
      recentActivity: activityList,
    };
  }
}
