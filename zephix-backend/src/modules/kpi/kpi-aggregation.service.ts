import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { KPIService, ProjectKPIs, PortfolioKPIs } from './kpi.service';
// import { KPIGateway } from './kpi.gateway';

export interface TaskMetrics {
  id: string;
  status: string;
  progress: number;
  estimatedHours: number;
  actualHours: number;
  isOverdue: boolean;
  resourceImpactScore: number;
  priority: string;
}

export interface WorkspaceKPIs {
  workspaceId: string;
  workspaceName: string;
  totalProjects: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  projectsOffTrack: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  overallResourceUtilization: number;
  totalBudget: number;
  budgetConsumed: number;
  criticalRisks: number;
  healthStatus: 'on-track' | 'at-risk' | 'off-track';
}

export interface ExecutiveKPIs {
  organizationId: string;
  totalProjects: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  projectsOffTrack: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  overallCompletionPercentage: number;
  overallResourceUtilization: number;
  totalBudget: number;
  budgetConsumed: number;
  criticalRisks: number;
  byWorkspace: WorkspaceKPIs[];
  directProjects: ProjectKPIs[];
  lastUpdated: Date;
}

@Injectable()
export class KPIAggregationService {
  private readonly logger = new Logger(KPIAggregationService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    private kpiService: KPIService,
    // private kpiGateway: KPIGateway,
  ) {}

  /**
   * Auto-detect project hierarchy type and build hierarchy path
   */
  async detectHierarchyPath(projectId: string): Promise<{
    hierarchyType: 'workspace' | 'program' | 'direct';
    hierarchyPath: string;
    workspaceId?: string;
    programId?: string;
  }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['workspace', 'organization'],
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    let hierarchyType: 'workspace' | 'program' | 'direct' = 'direct';
    let hierarchyPath = `${project.organizationId}`;
    let workspaceId: string | undefined;
    let programId: string | undefined;

    if (project.workspaceId) {
      hierarchyType = 'workspace';
      workspaceId = project.workspaceId;
      hierarchyPath = `${project.organizationId}/workspace/${project.workspaceId}/project/${projectId}`;
    } else if (project.programId) {
      hierarchyType = 'program';
      programId = project.programId;
      hierarchyPath = `${project.organizationId}/program/${project.programId}/project/${projectId}`;
    } else {
      hierarchyPath = `${project.organizationId}/project/${projectId}`;
    }

    // Update project with detected hierarchy
    await this.projectRepository.update(projectId, {
      hierarchyType,
      hierarchyPath,
    });

    return {
      hierarchyType,
      hierarchyPath,
      workspaceId,
      programId,
    };
  }

  /**
   * Calculate metrics for a single task
   */
  async calculateTaskMetrics(taskId: string): Promise<TaskMetrics> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const now = new Date();
    const isOverdue = task.endDate && new Date(task.endDate) < now && task.status !== 'completed';

    return {
      id: task.id,
      status: task.status,
      progress: task.progress || 0,
      estimatedHours: task.estimatedHours || 0,
      actualHours: 0, // TODO: Calculate from time tracking
      isOverdue,
      resourceImpactScore: task.resourceImpactScore || 0,
      priority: task.priority || 'medium',
    };
  }

  /**
   * Calculate KPIs for a project by aggregating from tasks
   */
  async calculateProjectKPIs(projectId: string): Promise<ProjectKPIs> {
    this.logger.log(`Calculating KPIs for project ${projectId}`);
    
    // Use existing KPI service
    const kpis = await this.kpiService.calculateProjectKPIs(projectId);
    
    // Update hierarchy path
    await this.detectHierarchyPath(projectId);
    
    return kpis;
  }

  /**
   * Calculate KPIs for a workspace by aggregating from projects
   */
  async calculateWorkspaceKPIs(workspaceId: string): Promise<WorkspaceKPIs> {
    this.logger.log(`Calculating KPIs for workspace ${workspaceId}`);

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
      relations: ['projects'],
    });

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const projects = workspace.projects || [];
    let projectsOnTrack = 0;
    let projectsAtRisk = 0;
    let projectsOffTrack = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let totalResourceUtilization = 0;
    let criticalRisks = 0;
    let totalBudget = 0;
    let budgetConsumed = 0;

    for (const project of projects) {
      const projectKPIs = await this.calculateProjectKPIs(project.id);
      
      if (projectKPIs.healthStatus === 'on-track') projectsOnTrack++;
      else if (projectKPIs.healthStatus === 'at-risk') projectsAtRisk++;
      else projectsOffTrack++;

      totalTasks += projectKPIs.tasksTotal;
      completedTasks += projectKPIs.tasksCompleted;
      overdueTasks += projectKPIs.tasksOverdue;
      totalResourceUtilization += projectKPIs.resourceUtilization;
      
      if (projectKPIs.riskScore > 75) criticalRisks++;
      
      totalBudget += project.budget || 0;
      budgetConsumed += project.actualCost || 0;
    }

    const completionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const overallResourceUtilization = projects.length > 0
      ? Math.round(totalResourceUtilization / projects.length)
      : 0;

    // Determine workspace health status
    const healthStatus = this.determineHealthStatus(
      completionPercentage,
      overdueTasks,
      criticalRisks
    );

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      totalProjects: projects.length,
      projectsOnTrack,
      projectsAtRisk,
      projectsOffTrack,
      totalTasks,
      completedTasks,
      overdueTasks,
      completionPercentage,
      overallResourceUtilization,
      totalBudget,
      budgetConsumed,
      criticalRisks,
      healthStatus,
    };
  }

  /**
   * Calculate executive-level KPIs for the entire organization
   */
  async calculateExecutiveKPIs(organizationId: string): Promise<ExecutiveKPIs> {
    this.logger.log(`Calculating executive KPIs for organization ${organizationId}`);

    // Get all workspaces
    const workspaces = await this.workspaceRepository.find({
      where: { organizationId, isActive: true },
    });

    // Get direct projects (not in workspaces or programs)
    const directProjects = await this.projectRepository.find({
      where: { 
        organizationId,
        workspaceId: null,
        programId: null,
      },
    });

    let totalProjects = 0;
    let projectsOnTrack = 0;
    let projectsAtRisk = 0;
    let projectsOffTrack = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let totalResourceUtilization = 0;
    let criticalRisks = 0;
    let totalBudget = 0;
    let budgetConsumed = 0;

    const workspaceKPIs: WorkspaceKPIs[] = [];
    const directProjectKPIs: ProjectKPIs[] = [];

    // Calculate workspace KPIs
    for (const workspace of workspaces) {
      const workspaceKPI = await this.calculateWorkspaceKPIs(workspace.id);
      workspaceKPIs.push(workspaceKPI);
      
      totalProjects += workspaceKPI.totalProjects;
      projectsOnTrack += workspaceKPI.projectsOnTrack;
      projectsAtRisk += workspaceKPI.projectsAtRisk;
      projectsOffTrack += workspaceKPI.projectsOffTrack;
      totalTasks += workspaceKPI.totalTasks;
      completedTasks += workspaceKPI.completedTasks;
      overdueTasks += workspaceKPI.overdueTasks;
      totalResourceUtilization += workspaceKPI.overallResourceUtilization;
      criticalRisks += workspaceKPI.criticalRisks;
      totalBudget += workspaceKPI.totalBudget;
      budgetConsumed += workspaceKPI.budgetConsumed;
    }

    // Calculate direct project KPIs
    for (const project of directProjects) {
      const projectKPI = await this.calculateProjectKPIs(project.id);
      directProjectKPIs.push(projectKPI);
      
      totalProjects++;
      if (projectKPI.healthStatus === 'on-track') projectsOnTrack++;
      else if (projectKPI.healthStatus === 'at-risk') projectsAtRisk++;
      else projectsOffTrack++;
      
      totalTasks += projectKPI.tasksTotal;
      completedTasks += projectKPI.tasksCompleted;
      overdueTasks += projectKPI.tasksOverdue;
      totalResourceUtilization += projectKPI.resourceUtilization;
      
      if (projectKPI.riskScore > 75) criticalRisks++;
      
      totalBudget += project.budget || 0;
      budgetConsumed += project.actualCost || 0;
    }

    const overallCompletionPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const overallResourceUtilization = totalProjects > 0
      ? Math.round(totalResourceUtilization / totalProjects)
      : 0;

    return {
      organizationId,
      totalProjects,
      projectsOnTrack,
      projectsAtRisk,
      projectsOffTrack,
      totalTasks,
      completedTasks,
      overdueTasks,
      overallCompletionPercentage,
      overallResourceUtilization,
      totalBudget,
      budgetConsumed,
      criticalRisks,
      byWorkspace: workspaceKPIs,
      directProjects: directProjectKPIs,
      lastUpdated: new Date(),
    };
  }

  /**
   * Trigger recalculation when a task is updated
   */
  async onTaskUpdate(taskId: string): Promise<void> {
    this.logger.log(`Task ${taskId} updated, triggering KPI recalculation`);

    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['project'],
      });

      if (!task || !task.project) {
        this.logger.warn(`Task ${taskId} or its project not found`);
        return;
      }

      // Recalculate project KPIs
      const projectKPIs = await this.calculateProjectKPIs(task.project.id);
      
      // TODO: Emit project update via WebSocket
      // await this.kpiGateway.emitProjectUpdate(task.project.id, task.project.organizationId, projectKPIs);

      // Detect hierarchy and recalculate up the chain
      const hierarchy = await this.detectHierarchyPath(task.project.id);

      if (hierarchy.workspaceId) {
        const workspaceKPIs = await this.calculateWorkspaceKPIs(hierarchy.workspaceId);
        // await this.kpiGateway.emitWorkspaceUpdate(hierarchy.workspaceId, task.project.organizationId, workspaceKPIs);
      }

      // Always recalculate executive KPIs
      const executiveKPIs = await this.calculateExecutiveKPIs(task.project.organizationId);
      // await this.kpiGateway.emitExecutiveUpdate(task.project.organizationId, executiveKPIs);

      this.logger.log(`KPI recalculation completed for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Error recalculating KPIs for task ${taskId}:`, error);
    }
  }

  private determineHealthStatus(
    completion: number,
    overdue: number,
    criticalRisks: number
  ): 'on-track' | 'at-risk' | 'off-track' {
    if (criticalRisks > 3 || overdue > 10) return 'off-track';
    if (criticalRisks > 1 || overdue > 5) return 'at-risk';
    return 'on-track';
  }
}
