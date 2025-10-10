import { Injectable, Optional, Logger } from '@nestjs/common';
import { ProjectsService } from '../modules/projects/services/projects.service';
import { RiskManagementService } from '../pm/risk-management/risk-management.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Optional() private readonly projectsService: ProjectsService,
    @Optional() private readonly riskManagementService: RiskManagementService,
  ) {}

  async getDashboardData(userId: string, organizationId: string): Promise<DashboardResponseDto> {
    const response: DashboardResponseDto = {
      myProjects: [],
      risksNeedingAttention: [],
      recentActivity: [],
      statistics: {
        totalProjects: 0,
        activeProjects: 0,
        risksIdentified: 0,
        upcomingDeadlines: 0
      }
    };

    // Get projects - graceful failure
    try {
      if (this.projectsService) {
        const projectsResult = await this.projectsService.findAllProjects(organizationId);
        
        response.myProjects = projectsResult.projects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: 0, // Project entity doesn't have progress field
          dueDate: p.endDate,
          role: 'member' // simplified for now
        }));
        
        response.statistics.totalProjects = projectsResult.total;
        response.statistics.activeProjects = projectsResult.projects.filter(p => p.status === 'active').length;
      }
    } catch (error) {
      this.logger.error('Failed to fetch projects for dashboard', error);
    }

    // Get risks - graceful failure
    try {
      if (this.riskManagementService) {
        // Only attempt if service exists
        const risks = await this.getRisksNeedingAttention(organizationId);
        response.risksNeedingAttention = risks;
        response.statistics.risksIdentified = risks.length;
      }
    } catch (error) {
      this.logger.error('Failed to fetch risks for dashboard', error);
    }

    return response;
  }

  private async getRisksNeedingAttention(organizationId: string): Promise<any[]> {
    // Simple query - high/very-high risks from last 30 days
    return [];  // Implement based on existing risk entity structure
  }

  async getRecentActivity(userId: string, organizationId: string, limit: number = 6): Promise<any[]> {
    try {
      // Get recent projects, tasks, and other activities
      const recentActivities = [];
      
      if (this.projectsService) {
        const projectsResult = await this.projectsService.findAllProjects(organizationId);
        const recentProjects = projectsResult.projects
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit)
          .map(project => ({
            id: project.id,
            type: 'project',
            title: `Project "${project.name}" created`,
            description: project.description || 'New project created',
            timestamp: project.createdAt,
            metadata: {
              projectId: project.id,
              status: project.status
            }
          }));
        
        recentActivities.push(...recentProjects);
      }
      
      // Sort by timestamp and limit
      return recentActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to fetch recent activity', error);
      return [];
    }
  }

  async getActionItems(userId: string, organizationId: string): Promise<any[]> {
    try {
      const actionItems = [];
      
      if (this.projectsService) {
        const projectsResult = await this.projectsService.findAllProjects(organizationId);
        
        // Find projects that need attention
        const projectsNeedingAttention = projectsResult.projects.filter(project => {
          // Projects that are overdue or need review
          const isOverdue = project.endDate && new Date(project.endDate) < new Date();
          const isStuck = project.status === 'planning' && 
            new Date(project.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days old
          
          return isOverdue || isStuck;
        });
        
        actionItems.push(...projectsNeedingAttention.map(project => {
          const isOverdue = project.endDate && new Date(project.endDate) < new Date();
          return {
            id: `project-${project.id}`,
            type: 'project',
            title: isOverdue ? `Project "${project.name}" is overdue` : `Project "${project.name}" needs review`,
            description: isOverdue ? 
              `This project was due on ${new Date(project.endDate).toLocaleDateString()}` :
              'This project has been in planning for over a week',
            priority: isOverdue ? 'high' : 'medium',
            dueDate: project.endDate,
            metadata: {
              projectId: project.id,
              status: project.status
            }
          };
        }));
      }
      
      return actionItems;
    } catch (error) {
      this.logger.error('Failed to fetch action items', error);
      return [];
    }
  }

  async getStats(userId: string, organizationId: string): Promise<any> {
    try {
      const stats = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        overdueProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalRisks: 0,
        highRisks: 0,
        upcomingDeadlines: 0
      };
      
      if (this.projectsService) {
        const projectsResult = await this.projectsService.findAllProjects(organizationId);
        const projects = projectsResult.projects;
        
        stats.totalProjects = projects.length;
        stats.activeProjects = projects.filter(p => p.status === 'active').length;
        stats.completedProjects = projects.filter(p => p.status === 'completed').length;
        stats.overdueProjects = projects.filter(p => 
          p.endDate && new Date(p.endDate) < new Date() && p.status !== 'completed'
        ).length;
        
        // Count upcoming deadlines (next 7 days)
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        stats.upcomingDeadlines = projects.filter(p => 
          p.endDate && new Date(p.endDate) <= nextWeek && p.status !== 'completed'
        ).length;
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Failed to fetch stats', error);
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        overdueProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        totalRisks: 0,
        highRisks: 0,
        upcomingDeadlines: 0
      };
    }
  }
}
