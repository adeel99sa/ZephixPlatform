import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
  ) {}

  async getProjectMetrics(organizationId: string) {
    // Get all projects for the organization
    const projects = await this.projectRepository.find({
      where: { organizationId },
      relations: ['tasks'],
    });

    // Calculate project metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const onHoldProjects = projects.filter(p => p.status === 'on-hold').length;

    // Calculate budget metrics
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalActualCost = projects.reduce((sum, p) => sum + (p.actualCost || 0), 0);
    const budgetVariance = totalBudget - totalActualCost;

    // Calculate timeline metrics
    const overdueProjects = projects.filter(p => {
      if (!p.endDate) return false;
      return new Date(p.endDate) < new Date() && p.status !== 'completed';
    }).length;

    // Calculate task metrics across all projects
    const allTasks = projects.flatMap(p => p.tasks || []);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
    const pendingTasks = allTasks.filter(t => (t as any).status === 'pending' || (t as any).status === 'todo').length;

    return {
      success: true,
      data: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          onHold: onHoldProjects,
          overdue: overdueProjects,
        },
        budget: {
          total: totalBudget,
          actual: totalActualCost,
          variance: budgetVariance,
          variancePercentage: totalBudget > 0 ? (budgetVariance / totalBudget) * 100 : 0,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          pending: pendingTasks,
          completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        },
        timeline: {
          overdueProjects,
          averageProjectDuration: this.calculateAverageProjectDuration(projects),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getResourceMetrics(organizationId: string) {
    // Get all teams for the organization
    const teams = await this.teamRepository.find({
      where: { organizationId },
      relations: ['members', 'members.user'],
    });

    // Calculate team metrics
    const totalTeams = teams.length;
    const activeTeams = teams.filter(t => t.isActive).length;

    // Calculate team member metrics
    const allTeamMembers = teams.flatMap(t => t.members || []);
    const totalTeamMembers = allTeamMembers.length;
    const activeTeamMembers = allTeamMembers.filter(m => m.isActive).length;

    // Calculate capacity metrics
    const totalCapacity = teams.reduce((sum, team) => {
      const activeMembers = (team.members || []).filter(m => m.isActive);
      return sum + (activeMembers.length * 40); // 40 hours per week per member
    }, 0);

    const totalAllocation = teams.reduce((sum, team) => {
      const activeMembers = (team.members || []).filter(m => m.isActive);
      return sum + (activeMembers.length * 20); // 20 hours per week allocated per member
    }, 0);

    const utilizationRate = totalCapacity > 0 ? (totalAllocation / totalCapacity) * 100 : 0;

    // Calculate role distribution
    const roleDistribution = allTeamMembers.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      data: {
        teams: {
          total: totalTeams,
          active: activeTeams,
        },
        members: {
          total: totalTeamMembers,
          active: activeTeamMembers,
        },
        capacity: {
          total: totalCapacity,
          allocated: totalAllocation,
          available: totalCapacity - totalAllocation,
          utilizationRate: Math.round(utilizationRate * 100) / 100,
        },
        roleDistribution,
        averageTeamSize: totalTeams > 0 ? Math.round((totalTeamMembers / totalTeams) * 100) / 100 : 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getRiskMetrics(organizationId: string) {
    // Get all projects for risk analysis
    const projects = await this.projectRepository.find({
      where: { organizationId },
      relations: ['tasks'],
    });

    // Calculate risk metrics based on project data
    const highRiskProjects = projects.filter(p => p.riskLevel === 'high').length;
    const mediumRiskProjects = projects.filter(p => p.riskLevel === 'medium').length;
    const lowRiskProjects = projects.filter(p => p.riskLevel === 'low').length;

    // Calculate risk factors
    const overdueProjects = projects.filter(p => {
      if (!p.endDate) return false;
      return new Date(p.endDate) < new Date() && p.status !== 'completed';
    }).length;

    const overBudgetProjects = projects.filter(p => {
      if (!p.budget || !p.actualCost) return false;
      return p.actualCost > p.budget;
    }).length;

    // Calculate task-based risks
    const allTasks = projects.flatMap(p => p.tasks || []);
    const overdueTasks = allTasks.filter(t => {
      if (!(t as any).dueDate) return false;
      return new Date((t as any).dueDate) < new Date() && t.status !== 'completed';
    }).length;

    const highPriorityTasks = allTasks.filter(t => t.priority === 'high').length;
    const blockedTasks = allTasks.filter(t => t.status === 'blocked').length;

    // Calculate overall risk score (0-100)
    const totalProjects = projects.length;
    const riskScore = totalProjects > 0 ? 
      ((highRiskProjects * 3 + mediumRiskProjects * 2 + lowRiskProjects * 1) / (totalProjects * 3)) * 100 : 0;

    return {
      success: true,
      data: {
        projectRisks: {
          high: highRiskProjects,
          medium: mediumRiskProjects,
          low: lowRiskProjects,
          total: totalProjects,
        },
        riskFactors: {
          overdueProjects,
          overBudgetProjects,
          overdueTasks,
          highPriorityTasks,
          blockedTasks,
        },
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel: this.determineRiskLevel(riskScore),
        recommendations: this.generateRiskRecommendations({
          overdueProjects,
          overBudgetProjects,
          overdueTasks,
          highPriorityTasks,
          blockedTasks,
        }),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private calculateAverageProjectDuration(projects: Project[]): number {
    if (projects.length === 0) return 0;
    
    const durations = projects
      .filter(p => p.startDate && p.endDate)
      .map(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)); // days
      });

    return durations.length > 0 ? 
      Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 100) / 100 : 0;
  }

  private determineRiskLevel(riskScore: number): string {
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(riskFactors: any): string[] {
    const recommendations = [];

    if (riskFactors.overdueProjects > 0) {
      recommendations.push(`Review ${riskFactors.overdueProjects} overdue project(s) and adjust timelines`);
    }

    if (riskFactors.overBudgetProjects > 0) {
      recommendations.push(`Address budget overruns in ${riskFactors.overBudgetProjects} project(s)`);
    }

    if (riskFactors.overdueTasks > 0) {
      recommendations.push(`Prioritize completion of ${riskFactors.overdueTasks} overdue task(s)`);
    }

    if (riskFactors.highPriorityTasks > 0) {
      recommendations.push(`Focus resources on ${riskFactors.highPriorityTasks} high-priority task(s)`);
    }

    if (riskFactors.blockedTasks > 0) {
      recommendations.push(`Resolve blockers for ${riskFactors.blockedTasks} blocked task(s)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Project health looks good! Continue monitoring for emerging risks.');
    }

    return recommendations;
  }
}
