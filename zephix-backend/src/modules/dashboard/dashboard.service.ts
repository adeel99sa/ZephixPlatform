import { Injectable, Optional, Logger } from '@nestjs/common';
import { ProjectsService } from '../projects/services/projects.service';
import { RiskManagementService } from '../risks/risk-management.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Optional() private readonly projectsService: ProjectsService,
    @Optional() private readonly riskManagementService: RiskManagementService,
  ) {}

  async getDashboardData(
    userId: string,
    organizationId: string,
  ): Promise<DashboardResponseDto> {
    const response: DashboardResponseDto = {
      myProjects: [],
      risksNeedingAttention: [],
      recentActivity: [],
      statistics: {
        totalProjects: 0,
        activeProjects: 0,
        risksIdentified: 0,
        upcomingDeadlines: 0,
      },
    };

    // Get projects - graceful failure
    try {
      if (this.projectsService) {
        const projectsResult =
          await this.projectsService.findAllProjects(organizationId);

        response.myProjects = projectsResult.projects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: 0, // Project entity doesn't have progress field
          dueDate: p.endDate,
          role: 'member', // simplified for now
        }));

        response.statistics.totalProjects = projectsResult.total;
        response.statistics.activeProjects = projectsResult.projects.filter(
          (p) => p.status === 'active',
        ).length;
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

  private async getRisksNeedingAttention(
    organizationId: string,
  ): Promise<any[]> {
    // Simple query - high/very-high risks from last 30 days
    return []; // Implement based on existing risk entity structure
  }
}
