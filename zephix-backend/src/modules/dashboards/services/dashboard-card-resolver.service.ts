import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { TaskStatus } from '../../work-management/enums/task.enums';
import { Project, ProjectHealth } from '../../projects/entities/project.entity';
import { WorkResourceAllocation } from '../../work-management/entities/work-resource-allocation.entity';
import { Risk } from '../../risks/entities/risk.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  DashboardCardData,
  DashboardCardKey,
  DashboardScopeType,
} from '../dashboard-card-types';

type ResolveParams = {
  organizationId: string;
  userId: string;
  platformRole?: string;
  scopeType: DashboardScopeType;
  scopeId: string;
  cardKey: DashboardCardKey;
};

@Injectable()
export class DashboardCardResolverService {
  constructor(
    @InjectRepository(WorkTask)
    private readonly taskRepository: Repository<WorkTask>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkResourceAllocation)
    private readonly allocationRepository: Repository<WorkResourceAllocation>,
    @InjectRepository(Risk)
    private readonly riskRepository: Repository<Risk>,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async resolveCardData(params: ResolveParams): Promise<DashboardCardData> {
    switch (params.cardKey) {
      case 'my_tasks_today':
        return this.resolveMyTasksToday(params);
      case 'overdue_tasks':
        return this.resolveOverdueTasks(params);
      case 'blocked_tasks':
        return this.resolveBlockedTasks(params);
      case 'tasks_by_status':
        return this.resolveTasksByStatus(params);
      case 'projects_at_risk':
        return this.resolveProjectsAtRisk(params);
      case 'upcoming_deadlines':
        return this.resolveUpcomingDeadlines(params);
      case 'milestone_progress':
        return this.resolveMilestoneProgress(params);
      case 'workload_distribution':
        return this.resolveWorkloadDistribution(params);
      case 'resource_capacity':
        return this.resolveResourceCapacity(params);
      case 'active_risks':
        return this.resolveActiveRisks(params);
      default:
        throw new NotFoundException(`Unsupported card resolver: ${params.cardKey}`);
    }
  }

  private async resolveMyTasksToday(params: ResolveParams): Promise<DashboardCardData> {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    const rows = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('task.assignee_user_id = :userId', { userId: params.userId })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.due_date = :today', { today: todayIso })
      .andWhere('task.status NOT IN (:...terminal)', {
        terminal: [TaskStatus.DONE, TaskStatus.CANCELED],
      })
      .orderBy('task.updated_at', 'DESC')
      .getMany();

    return {
      cardKey: 'my_tasks_today',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: rows.length, secondaryLabel: 'tasks due today' },
      displayData: { taskIds: rows.map((item) => item.id) },
      drilldown: { route: '/my-tasks?view=assigned&filter=today' },
      generatedFromTimestamp: this.maxTimestamp(rows.map((item) => item.updatedAt)),
    };
  }

  private async resolveOverdueTasks(params: ResolveParams): Promise<DashboardCardData> {
    const today = new Date();
    const base = this.taskRepository
      .createQueryBuilder('task')
      .where('task.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.due_date IS NOT NULL')
      .andWhere('task.due_date < :today', { today })
      .andWhere('task.status NOT IN (:...terminal)', {
        terminal: [TaskStatus.DONE, TaskStatus.CANCELED],
      });

    const route =
      params.scopeType === 'home'
        ? '/my-tasks?view=assigned&filter=overdue'
        : '/projects?filter=overdue-tasks';
    if (params.scopeType === 'home') {
      base.andWhere('task.assignee_user_id = :userId', { userId: params.userId });
    } else {
      const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
      if (visibleProjectIds.length === 0) {
        return this.emptyCard('overdue_tasks', params.scopeType, params.scopeId, route);
      }
      base.andWhere('task.workspace_id = :workspaceId', { workspaceId: params.scopeId });
      base.andWhere('task.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      });
    }

    const rows = await base.orderBy('task.updated_at', 'DESC').getMany();
    return {
      cardKey: 'overdue_tasks',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: rows.length, secondaryLabel: 'overdue open tasks' },
      displayData: { taskIds: rows.map((item) => item.id) },
      drilldown: { route },
      generatedFromTimestamp: this.maxTimestamp(rows.map((item) => item.updatedAt)),
    };
  }

  private async resolveBlockedTasks(params: ResolveParams): Promise<DashboardCardData> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.status = :blocked', { blocked: TaskStatus.BLOCKED });

    const route =
      params.scopeType === 'home'
        ? '/my-tasks?view=assigned&filter=blocked'
        : '/projects?filter=blocked-tasks';
    if (params.scopeType === 'home') {
      query.andWhere('task.assignee_user_id = :userId', { userId: params.userId });
    } else {
      const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
      if (visibleProjectIds.length === 0) {
        return this.emptyCard('blocked_tasks', params.scopeType, params.scopeId, route);
      }
      query.andWhere('task.workspace_id = :workspaceId', { workspaceId: params.scopeId });
      query.andWhere('task.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      });
    }

    const rows = await query.orderBy('task.updated_at', 'DESC').getMany();
    return {
      cardKey: 'blocked_tasks',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: rows.length, secondaryLabel: 'blocked tasks' },
      displayData: { taskIds: rows.map((item) => item.id) },
      drilldown: { route },
      generatedFromTimestamp: this.maxTimestamp(rows.map((item) => item.updatedAt)),
    };
  }

  private async resolveTasksByStatus(params: ResolveParams): Promise<DashboardCardData> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('task.deleted_at IS NULL');

    if (params.scopeType === 'home') {
      query.andWhere('task.assignee_user_id = :userId', { userId: params.userId });
    } else {
      const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
      if (visibleProjectIds.length === 0) {
        return this.emptyCard(
          'tasks_by_status',
          params.scopeType,
          params.scopeId,
          '/projects',
        );
      }
      query.andWhere('task.workspace_id = :workspaceId', { workspaceId: params.scopeId });
      query.andWhere('task.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      });
    }
    query.groupBy('task.status');
    const rows = await query.getRawMany<{ status: string; count: string }>();

    const byStatus = Object.fromEntries(
      rows.map((item) => [item.status, Number(item.count)]),
    );
    const total = rows.reduce((sum, item) => sum + Number(item.count), 0);
    const timestamps = await this.taskRepository
      .createQueryBuilder('task')
      .select('MAX(task.updated_at)', 'maxUpdatedAt')
      .where('task.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .getRawOne<{ maxUpdatedAt: string | null }>();

    return {
      cardKey: 'tasks_by_status',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: total, secondaryLabel: 'total tasks in scope' },
      displayData: { byStatus },
      drilldown: { route: params.scopeType === 'home' ? '/my-tasks' : '/projects' },
      generatedFromTimestamp:
        timestamps?.maxUpdatedAt || new Date(0).toISOString(),
    };
  }

  private async resolveProjectsAtRisk(params: ResolveParams): Promise<DashboardCardData> {
    const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
    if (visibleProjectIds.length === 0) {
      return this.emptyCard(
        'projects_at_risk',
        params.scopeType,
        params.scopeId,
        '/projects?filter=at-risk',
      );
    }
    // IMPORTANT: visibility scoping happens before aggregate.
    const rows = await this.projectRepository.find({
      where: {
        organizationId: params.organizationId,
        workspaceId: params.scopeId,
        id: In(visibleProjectIds),
        deletedAt: IsNull(),
      },
      select: ['id', 'health', 'updatedAt'],
    });
    const atRisk = rows.filter(
      (item) =>
        item.health === ProjectHealth.AT_RISK || item.health === ProjectHealth.BLOCKED,
    );

    return {
      cardKey: 'projects_at_risk',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: atRisk.length, secondaryLabel: 'at-risk projects' },
      displayData: { projectIds: atRisk.map((item) => item.id) },
      drilldown: { route: '/projects?filter=at-risk' },
      generatedFromTimestamp: this.maxTimestamp(rows.map((item) => item.updatedAt)),
    };
  }

  private async resolveUpcomingDeadlines(params: ResolveParams): Promise<DashboardCardData> {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('task.deleted_at IS NULL')
      .andWhere('task.due_date IS NOT NULL')
      .andWhere('task.due_date >= :today', { today })
      .andWhere('task.due_date <= :nextWeek', { nextWeek })
      .andWhere('task.status NOT IN (:...terminal)', {
        terminal: [TaskStatus.DONE, TaskStatus.CANCELED],
      });

    if (params.scopeType === 'home') {
      query.andWhere('task.assignee_user_id = :userId', { userId: params.userId });
    } else {
      const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
      if (visibleProjectIds.length === 0) {
        return this.emptyCard(
          'upcoming_deadlines',
          params.scopeType,
          params.scopeId,
          '/projects?filter=upcoming',
        );
      }
      query.andWhere('task.workspace_id = :workspaceId', { workspaceId: params.scopeId });
      query.andWhere('task.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      });
    }

    const rows = await query.orderBy('task.due_date', 'ASC').getMany();
    return {
      cardKey: 'upcoming_deadlines',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: rows.length, secondaryLabel: 'deadlines in next 7 days' },
      displayData: {
        taskIds: rows.map((item) => item.id),
      },
      drilldown: {
        route:
          params.scopeType === 'home'
            ? '/my-tasks?filter=upcoming'
            : '/projects?filter=upcoming',
      },
      generatedFromTimestamp: this.maxTimestamp(rows.map((item) => item.updatedAt)),
    };
  }

  private async resolveMilestoneProgress(params: ResolveParams): Promise<DashboardCardData> {
    const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
    if (visibleProjectIds.length === 0) {
      return this.emptyCard(
        'milestone_progress',
        params.scopeType,
        params.scopeId,
        '/projects?view=milestones',
      );
    }
    // IMPORTANT: visibility scoping happens before aggregate.
    const milestones = await this.taskRepository.find({
      where: {
        organizationId: params.organizationId,
        workspaceId: params.scopeId,
        projectId: In(visibleProjectIds),
        isMilestone: true,
        deletedAt: IsNull(),
      },
      select: ['id', 'status', 'updatedAt'],
    });
    const completed = milestones.filter((item) => item.status === TaskStatus.DONE).length;
    return {
      cardKey: 'milestone_progress',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: completed, secondaryLabel: 'completed milestones', secondaryValue: milestones.length },
      displayData: { completed, total: milestones.length },
      drilldown: { route: '/projects?view=milestones' },
      generatedFromTimestamp: this.maxTimestamp(
        milestones.map((item) => item.updatedAt),
      ),
    };
  }

  private async resolveWorkloadDistribution(params: ResolveParams): Promise<DashboardCardData> {
    const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
    if (visibleProjectIds.length === 0) {
      return this.emptyCard(
        'workload_distribution',
        params.scopeType,
        params.scopeId,
        '/resources',
      );
    }
    // IMPORTANT: visibility scoping happens before aggregate.
    const rows = await this.allocationRepository
      .createQueryBuilder('allocation')
      .select('allocation.user_id', 'userId')
      .addSelect('SUM(allocation.allocation_percent)', 'totalAllocationPercent')
      .addSelect('MAX(allocation.updated_at)', 'updatedAt')
      .where('allocation.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('allocation.workspace_id = :workspaceId', { workspaceId: params.scopeId })
      .andWhere('allocation.deleted_at IS NULL')
      .andWhere('allocation.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      })
      .groupBy('allocation.user_id')
      .orderBy('SUM(allocation.allocation_percent)', 'DESC')
      .getRawMany<{
        userId: string;
        totalAllocationPercent: string;
        updatedAt: string;
      }>();

    return {
      cardKey: 'workload_distribution',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: {
        primaryValue: rows.length,
        secondaryLabel: 'allocated members',
      },
      displayData: {
        members: rows.map((item) => ({
          userId: item.userId,
          totalAllocationPercent: Number(item.totalAllocationPercent),
        })),
      },
      drilldown: { route: '/resources' },
      generatedFromTimestamp: this.maxTimestamp(
        rows.map((item) => new Date(item.updatedAt)),
      ),
    };
  }

  private async resolveResourceCapacity(params: ResolveParams): Promise<DashboardCardData> {
    const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
    if (visibleProjectIds.length === 0) {
      return this.emptyCard(
        'resource_capacity',
        params.scopeType,
        params.scopeId,
        '/capacity',
      );
    }
    // IMPORTANT: visibility scoping happens before aggregate.
    const rows = await this.allocationRepository
      .createQueryBuilder('allocation')
      .select('allocation.user_id', 'userId')
      .addSelect('SUM(allocation.allocation_percent)', 'totalAllocationPercent')
      .addSelect('MAX(allocation.updated_at)', 'updatedAt')
      .where('allocation.organization_id = :organizationId', {
        organizationId: params.organizationId,
      })
      .andWhere('allocation.workspace_id = :workspaceId', { workspaceId: params.scopeId })
      .andWhere('allocation.deleted_at IS NULL')
      .andWhere('allocation.project_id IN (:...projectIds)', {
        projectIds: visibleProjectIds,
      })
      .groupBy('allocation.user_id')
      .getRawMany<{
        userId: string;
        totalAllocationPercent: string;
        updatedAt: string;
      }>();

    const totals = rows.map((item) => Number(item.totalAllocationPercent));
    const overCapacityCount = totals.filter((value) => value > 100).length;
    const averageAllocation =
      totals.length > 0
        ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length)
        : 0;
    return {
      cardKey: 'resource_capacity',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: {
        primaryValue: overCapacityCount,
        secondaryLabel: 'members above 100%',
        secondaryValue: averageAllocation,
      },
      displayData: {
        overCapacityCount,
        averageAllocationPercent: averageAllocation,
        members: rows.map((item) => ({
          userId: item.userId,
          totalAllocationPercent: Number(item.totalAllocationPercent),
        })),
      },
      drilldown: { route: '/capacity' },
      generatedFromTimestamp: this.maxTimestamp(
        rows.map((item) => new Date(item.updatedAt)),
      ),
    };
  }

  private async resolveActiveRisks(params: ResolveParams): Promise<DashboardCardData> {
    const visibleProjectIds = await this.getVisibleWorkspaceProjectIds(params);
    if (visibleProjectIds.length === 0) {
      return this.emptyCard(
        'active_risks',
        params.scopeType,
        params.scopeId,
        '/risks',
      );
    }
    // IMPORTANT: visibility scoping happens before aggregate.
    const rows = await this.riskRepository.find({
      where: {
        organizationId: params.organizationId,
        projectId: In(visibleProjectIds),
      },
      select: ['id', 'status', 'severity', 'updatedAt'],
      order: { updatedAt: 'DESC' },
    });
    const open = rows.filter((item) => (item.status || 'open') !== 'closed');
    const severityCounts = open.reduce<Record<string, number>>((acc, item) => {
      const key = String(item.severity || 'unknown').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      cardKey: 'active_risks',
      scopeType: params.scopeType,
      scopeId: params.scopeId,
      summary: { primaryValue: open.length, secondaryLabel: 'open risks' },
      displayData: { severityCounts, riskIds: open.map((item) => item.id) },
      drilldown: { route: '/risks' },
      generatedFromTimestamp: this.maxTimestamp(rows.map((item) => item.updatedAt)),
    };
  }

  private emptyCard(
    cardKey: DashboardCardKey,
    scopeType: DashboardScopeType,
    scopeId: string,
    route: string,
  ): DashboardCardData {
    return {
      cardKey,
      scopeType,
      scopeId,
      summary: { primaryValue: 0 },
      displayData: {},
      drilldown: { route },
      generatedFromTimestamp: new Date(0).toISOString(),
    };
  }

  private maxTimestamp(values: Array<Date | null | undefined>): string {
    const valid = values.filter((value): value is Date => value instanceof Date);
    if (valid.length === 0) {
      return new Date(0).toISOString();
    }
    return new Date(
      Math.max(...valid.map((value) => value.getTime())),
    ).toISOString();
  }

  private async getVisibleWorkspaceProjectIds(params: ResolveParams): Promise<string[]> {
    if (params.scopeType !== 'workspace') {
      return [];
    }
    const workspaceRole = await this.workspaceAccessService.getUserWorkspaceRole(
      params.organizationId,
      params.scopeId,
      params.userId,
      params.platformRole,
    );
    const isProjectOnly = workspaceRole === null;
    if (isProjectOnly) {
      return this.workspaceAccessService.getProjectOnlyVisibleProjectIdsInWorkspace(
        params.organizationId,
        params.userId,
        params.scopeId,
      );
    }
    const rows = await this.projectRepository.find({
      where: {
        organizationId: params.organizationId,
        workspaceId: params.scopeId,
        deletedAt: IsNull(),
      },
      select: ['id'],
    });
    return rows.map((item) => item.id);
  }
}

