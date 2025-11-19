import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { WorkflowTemplate } from '../pm/entities/workflow-template.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(WorkflowTemplate)
    private readonly workflowRepository: Repository<WorkflowTemplate>,
  ) {}

  /**
   * Get comprehensive admin statistics
   */
  async getStatistics() {
    try {
      const [userCount, activeUsers, templateCount, projectCount] =
        await Promise.all([
          this.userRepository.count(),
          this.userRepository.count({ where: { isActive: true } }),
          this.workflowRepository.count(),
          this.projectRepository.count(),
        ]);

      return {
        userCount,
        activeUsers,
        templateCount,
        projectCount,
        totalItems: userCount + templateCount + projectCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch admin statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getSystemHealth() {
    try {
      // Basic health check
      const dbConnection = await this.userRepository.query('SELECT 1');

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbConnection ? 'connected' : 'disconnected',
        services: {
          userService: 'operational',
          projectService: 'operational',
          workflowService: 'operational',
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to check system health: ${error.message}`,
        error.stack,
      );
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
