import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { Resource } from '../resources/entities/resource.entity';

export interface ProjectKPIs {
  tasksTotal: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionPercentage: number;
  resourceUtilization: number;
  budgetUsed: number;
  riskScore: number;
  healthStatus: 'on-track' | 'at-risk' | 'off-track';
}

export interface PortfolioKPIs {
  totalProjects: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  projectsOffTrack: number;
  overallResourceUtilization: number;
  totalBudget: number;
  budgetConsumed: number;
  criticalRisks: number;
}

@Injectable()
export class KPIService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
  ) {}

  async calculateProjectKPIs(projectId: string): Promise<ProjectKPIs> {
    const tasks = await this.taskRepository.find({
      where: { projectId }
    });

    const project = await this.projectRepository.findOne({
      where: { id: projectId }
    });

    const now = new Date();
    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const tasksOverdue = tasks.filter(t => 
      t.endDate && new Date(t.endDate) < now && t.status !== 'completed'
    ).length;
    
    const completionPercentage = tasksTotal > 0 
      ? Math.round((tasksCompleted / tasksTotal) * 100)
      : 0;

    // Calculate resource utilization
    const resourceUtilization = await this.calculateProjectResourceUtilization(projectId);
    
    // Calculate budget usage
    const budgetUsed = project?.actualCost && project?.budget
      ? Math.round((project.actualCost / project.budget) * 100)
      : 0;

    // Calculate risk score
    const riskScore = this.calculateRiskScore(tasksOverdue, resourceUtilization, budgetUsed);
    
    // Determine health status
    const healthStatus = this.determineHealthStatus(completionPercentage, tasksOverdue, riskScore);

    return {
      tasksTotal,
      tasksCompleted,
      tasksOverdue,
      completionPercentage,
      resourceUtilization,
      budgetUsed,
      riskScore,
      healthStatus
    };
  }

  async calculatePortfolioKPIs(organizationId: string): Promise<PortfolioKPIs> {
    const projects = await this.projectRepository.find({
      where: { organizationId }
    });

    let projectsOnTrack = 0;
    let projectsAtRisk = 0;
    let projectsOffTrack = 0;
    let totalResourceUtilization = 0;
    let criticalRisks = 0;

    for (const project of projects) {
      const kpis = await this.calculateProjectKPIs(project.id);
      
      if (kpis.healthStatus === 'on-track') projectsOnTrack++;
      else if (kpis.healthStatus === 'at-risk') projectsAtRisk++;
      else projectsOffTrack++;

      totalResourceUtilization += kpis.resourceUtilization;
      
      if (kpis.riskScore > 75) criticalRisks++;
    }

    const overallResourceUtilization = projects.length > 0
      ? Math.round(totalResourceUtilization / projects.length)
      : 0;

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const budgetConsumed = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);

    return {
      totalProjects: projects.length,
      projectsOnTrack,
      projectsAtRisk,
      projectsOffTrack,
      overallResourceUtilization,
      totalBudget,
      budgetConsumed,
      criticalRisks
    };
  }

  private async calculateProjectResourceUtilization(projectId: string): Promise<number> {
    const tasks = await this.taskRepository.find({
      where: { projectId }
    });

    const totalResourceImpact = tasks.reduce((sum, task) => 
      sum + (task.resourceImpactScore || 0), 0
    );

    const avgUtilization = tasks.length > 0
      ? Math.round(totalResourceImpact / tasks.length)
      : 0;

    return Math.min(avgUtilization, 150); // Cap at 150%
  }

  private calculateRiskScore(tasksOverdue: number, resourceUtilization: number, budgetUsed: number): number {
    let score = 0;
    
    // Overdue tasks contribute to risk
    if (tasksOverdue > 0) score += Math.min(tasksOverdue * 10, 30);
    
    // Over-utilization contributes to risk
    if (resourceUtilization > 100) score += Math.min((resourceUtilization - 100) * 2, 40);
    
    // Budget overrun contributes to risk
    if (budgetUsed > 100) score += Math.min((budgetUsed - 100), 30);
    
    return Math.min(score, 100);
  }

  private determineHealthStatus(
    completion: number, 
    overdue: number, 
    risk: number
  ): 'on-track' | 'at-risk' | 'off-track' {
    if (risk > 75 || overdue > 5) return 'off-track';
    if (risk > 50 || overdue > 2) return 'at-risk';
    return 'on-track';
  }

  async invalidateProjectCache(projectId: string): Promise<void> {
    // For now, we'll just log that cache should be invalidated
    // In a real implementation, you'd clear Redis cache or similar
    console.log(`KPI cache invalidated for project: ${projectId}`);
  }
}

