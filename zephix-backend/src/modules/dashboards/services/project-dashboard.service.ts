/**
 * Phase 7.5: Project Dashboard Service
 * Provides dashboard data for projects with KPI filtering based on activeKpiIds
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { TaskStatus } from '../../work-management/enums/task.enums';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { ProjectsService } from '../../projects/services/projects.service';
import { ProjectHealthService } from '../../work-management/services/project-health.service';

export interface ProjectDashboardSummary {
  health: string;
  healthLabel: string;
  behindTargetDays: number | null;
  counts: {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    doneTasks: number;
    blockedTasks: number;
  };
  overdue: number;
  blocked: number;
}

export interface ProjectDashboardKPI {
  id: string;
  name: string;
  description?: string;
  type: 'computed' | 'manual';
  unit?: string;
  currentValue: number | null;
  lastUpdated: string | null;
  calculationMethod?: string;
}

export interface ProjectDashboardWork {
  phaseRollups: Array<{
    phaseId: string;
    phaseName: string;
    totalTasks: number;
    doneTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
  }>;
  statusCounts: {
    BACKLOG: number;
    TODO: number;
    IN_PROGRESS: number;
    BLOCKED: number;
    IN_REVIEW: number;
    DONE: number;
    CANCELED: number;
  };
  topBlockers: Array<{
    taskId: string;
    title: string;
    blockedReason?: string;
  }>;
}

@Injectable()
export class ProjectDashboardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkTask)
    private readonly taskRepository: Repository<WorkTask>,
    @InjectRepository(WorkPhase)
    private readonly phaseRepository: Repository<WorkPhase>,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly projectsService: ProjectsService,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  /**
   * Get project summary dashboard data
   */
  async getProjectSummary(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjectDashboardSummary> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      userRole,
    );
    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    // Load project
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get health data
    const healthResult = await this.projectHealthService.computeHealth(
      projectId,
      organizationId,
      workspaceId,
    );

    // Get task counts
    const tasks = await this.taskRepository.find({
      where: {
        projectId,
        organizationId,
        workspaceId,
      },
    });

    const counts = {
      totalTasks: tasks.length,
      todoTasks: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      inProgressTasks: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .length,
      doneTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      blockedTasks: tasks.filter((t) => t.status === TaskStatus.BLOCKED).length,
    };

    // Count overdue tasks
    const now = new Date();
    const overdue = tasks.filter((task) => {
      if (!task.dueDate || task.status === TaskStatus.DONE) return false;
      return new Date(task.dueDate) < now;
    }).length;

    const healthLabels: Record<string, string> = {
      HEALTHY: 'On track',
      AT_RISK: 'Needs attention',
      BLOCKED: 'Blocked',
    };

    return {
      health: project.health || healthResult.health,
      healthLabel:
        healthLabels[project.health || healthResult.health] || 'Unknown',
      behindTargetDays:
        project.behindTargetDays !== null
          ? project.behindTargetDays
          : healthResult.behindTargetDays,
      counts,
      overdue,
      blocked: counts.blockedTasks,
    };
  }

  /**
   * Get project KPIs - only active KPIs with computed values
   */
  async getProjectKPIs(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjectDashboardKPI[]> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      userRole,
    );
    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    // Load project with activeKpiIds
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get available KPIs from project template
    const kpiData = await this.projectsService.getProjectKPIs(
      projectId,
      organizationId,
      userId,
      userRole,
    );

    // Filter to only active KPIs
    const activeKPIs = kpiData.availableKPIs.filter((kpi) =>
      (project.activeKpiIds || []).includes(kpi.id),
    );

    // Get task data for computed KPIs
    const tasks = await this.taskRepository.find({
      where: {
        projectId,
        organizationId,
        workspaceId,
      },
    });

    // Compute values for active KPIs
    return activeKPIs.map((kpi) => {
      const isComputed =
        kpi.calculationMethod ||
        kpi.type === 'computed' ||
        kpi.type === 'Computed';

      if (isComputed) {
        // Compute from work signals
        const value = this.computeKPIValue(kpi, tasks);
        return {
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          type: 'computed' as const,
          unit: kpi.unit,
          currentValue: value,
          lastUpdated: new Date().toISOString(),
          calculationMethod: kpi.calculationMethod,
        };
      } else {
        // Manual - return null until manual entry implemented
        return {
          id: kpi.id,
          name: kpi.name,
          description: kpi.description,
          type: 'manual' as const,
          unit: kpi.unit,
          currentValue: null,
          lastUpdated: null,
        };
      }
    });
  }

  /**
   * Get project work dashboard data
   */
  async getProjectWork(
    projectId: string,
    workspaceId: string,
    organizationId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjectDashboardWork> {
    // Verify workspace access
    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      userRole,
    );
    if (!canAccess) {
      throw new ForbiddenException('Workspace access denied');
    }

    // Load project
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organizationId,
        workspaceId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get phases
    const phases = await this.phaseRepository.find({
      where: {
        projectId,
        organizationId,
        workspaceId,
      },
    });

    // Get tasks
    const tasks = await this.taskRepository.find({
      where: {
        projectId,
        organizationId,
        workspaceId,
      },
      relations: ['phase'],
    });

    // Phase rollups
    const phaseRollups = phases.map((phase) => {
      const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
      return {
        phaseId: phase.id,
        phaseName: phase.name,
        totalTasks: phaseTasks.length,
        doneTasks: phaseTasks.filter((t) => t.status === TaskStatus.DONE)
          .length,
        inProgressTasks: phaseTasks.filter(
          (t) => t.status === TaskStatus.IN_PROGRESS,
        ).length,
        blockedTasks: phaseTasks.filter((t) => t.status === TaskStatus.BLOCKED)
          .length,
      };
    });

    // Status counts
    const statusCounts = {
      BACKLOG: tasks.filter((t) => t.status === TaskStatus.BACKLOG).length,
      TODO: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      IN_PROGRESS: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS)
        .length,
      BLOCKED: tasks.filter((t) => t.status === TaskStatus.BLOCKED).length,
      IN_REVIEW: tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length,
      DONE: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      CANCELED: tasks.filter((t) => t.status === TaskStatus.CANCELED).length,
    };

    // Top blockers (blocked tasks)
    const topBlockers = tasks
      .filter((t) => t.status === TaskStatus.BLOCKED)
      .slice(0, 5)
      .map((task) => ({
        taskId: task.id,
        title: task.title,
        blockedReason: task.metadata?.blockedReason || undefined,
      }));

    return {
      phaseRollups,
      statusCounts,
      topBlockers,
    };
  }

  /**
   * Compute KPI value from work signals
   */
  private computeKPIValue(kpi: any, tasks: WorkTask[]): number | null {
    // Simple computed KPIs based on task status
    const totalTasks = tasks.length;
    if (totalTasks === 0) return null;

    // Task completion rate
    if (
      kpi.name?.toLowerCase().includes('completion') ||
      kpi.calculationMethod === 'completion_rate'
    ) {
      const doneTasks = tasks.filter(
        (t) => t.status === TaskStatus.DONE,
      ).length;
      return totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
    }

    // On-time delivery (placeholder - would need due date tracking)
    if (
      kpi.name?.toLowerCase().includes('on-time') ||
      kpi.calculationMethod === 'on_time_delivery'
    ) {
      // For MVP, return placeholder
      return null;
    }

    // Average cycle time (placeholder - would need start/completion tracking)
    if (
      kpi.name?.toLowerCase().includes('cycle') ||
      kpi.calculationMethod === 'cycle_time'
    ) {
      return null;
    }

    // Default: return null for unknown computed KPIs
    return null;
  }
}
