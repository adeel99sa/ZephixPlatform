import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { WorkflowTemplate } from '../pm/entities/workflow-template.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Workspace } from '../modules/workspaces/entities/workspace.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import {
  AdminStatistics,
  SystemHealth,
  OrgSummary,
  UsersSummary,
  WorkspacesSummary,
  RiskSummary,
} from './dto/admin-response.dto';

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
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  /**
   * Get comprehensive admin statistics
   * Always returns HTTP 200 with safe defaults on any error
   */
  async getStatistics(organizationId?: string): Promise<AdminStatistics> {
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
      // Log structured error with context for debugging
      this.logger.error(`Failed to fetch admin statistics`, {
        error: error instanceof Error ? error.message : String(error),
        organizationId: organizationId || 'unknown',
        route: 'GET /api/admin/stats',
      });

      // Return safe defaults - never throw
      return {
        userCount: 0,
        activeUsers: 0,
        templateCount: 0,
        projectCount: 0,
        totalItems: 0,
      };
    }
  }

  async getSystemHealth(organizationId?: string): Promise<SystemHealth> {
    try {
      // Basic health check - test database connection
      await this.userRepository.query('SELECT 1');

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'ok',
        services: {
          userService: 'operational',
          projectService: 'operational',
          workflowService: 'operational',
        },
      };
    } catch (error) {
      // Log structured error with context for debugging
      this.logger.error(`Failed to check system health`, {
        error: error instanceof Error ? error.message : String(error),
        organizationId: organizationId || 'unknown',
        route: 'GET /api/admin/health',
      });

      // Return error status but never throw - always return HTTP 200
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'error',
        details: {
          message: 'Internal health check failed',
        },
      };
    }
  }

  /**
   * Get organization summary
   * Never throws - returns safe defaults on error
   */
  async getOrgSummary(organizationId: string): Promise<OrgSummary> {
    try {
      const org = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!org) {
        // Return safe defaults if org not found
        return {
          name: 'Organization',
          id: organizationId,
          slug: 'unknown',
          totalUsers: 0,
          totalWorkspaces: 0,
        };
      }

      const [totalUsers, totalWorkspaces] = await Promise.all([
        this.userOrganizationRepository
          .count({
            where: { organizationId, isActive: true },
          })
          .catch(() => 0),
        this.workspaceRepository
          .count({
            where: { organizationId },
          })
          .catch(() => 0),
      ]);

      return {
        name: org.name,
        id: org.id,
        slug: org.slug,
        totalUsers,
        totalWorkspaces,
      };
    } catch (error) {
      this.logger.error('Failed to fetch org summary', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        route: 'GET /api/admin/org/summary',
      });
      // Return safe defaults - never throw
      return {
        name: 'Organization',
        id: organizationId,
        slug: 'unknown',
        totalUsers: 0,
        totalWorkspaces: 0,
      };
    }
  }

  /**
   * Get users summary by role
   * Never throws - returns safe defaults on error
   */
  async getUsersSummary(organizationId: string): Promise<UsersSummary> {
    try {
      const userOrgs = await this.userOrganizationRepository
        .find({
          where: { organizationId, isActive: true },
        })
        .catch(() => []);

      const byRole = {
        owners: 0,
        admins: 0,
        members: 0,
        viewers: 0,
      };

      userOrgs.forEach((uo) => {
        const role = uo.role?.toLowerCase();
        if (role === 'owner') byRole.owners++;
        else if (role === 'admin') byRole.admins++;
        else if (role === 'member') byRole.members++;
        else if (role === 'viewer') byRole.viewers++;
      });

      return {
        total: userOrgs.length,
        byRole,
      };
    } catch (error) {
      this.logger.error('Failed to fetch users summary', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        route: 'GET /api/admin/users/summary',
      });
      // Return safe defaults - never throw
      return {
        total: 0,
        byRole: {
          owners: 0,
          admins: 0,
          members: 0,
          viewers: 0,
        },
      };
    }
  }

  /**
   * Get workspaces summary
   * Never throws - returns safe defaults on error
   */
  async getWorkspacesSummary(
    organizationId: string,
  ): Promise<WorkspacesSummary> {
    try {
      const workspaces = await this.workspaceRepository
        .find({
          where: { organizationId },
        })
        .catch(() => []);

      const byType = {
        public: 0,
        private: 0,
      };

      const byStatus = {
        active: 0,
        archived: 0,
      };

      workspaces.forEach((ws) => {
        if (ws.isPrivate) {
          byType.private++;
        } else {
          byType.public++;
        }

        if (ws.deletedAt) {
          byStatus.archived++;
        } else {
          byStatus.active++;
        }
      });

      return {
        total: workspaces.length,
        byType,
        byStatus,
      };
    } catch (error) {
      this.logger.error('Failed to fetch workspaces summary', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId,
        route: 'GET /api/admin/workspaces/summary',
      });
      // Return safe defaults - never throw
      return {
        total: 0,
        byType: {
          public: 0,
          private: 0,
        },
        byStatus: {
          active: 0,
          archived: 0,
        },
      };
    }
  }

  /**
   * Get risk summary (stub for now)
   */
  async getRiskSummary(organizationId: string): Promise<RiskSummary> {
    try {
      // Stub implementation - return zeroed values for now
      // This can be expanded later with actual risk calculations
      return {
        projectsAtRisk: 0,
        overallocatedResources: 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch risk summary: ${error.message}`,
        error.stack,
      );
      return {
        projectsAtRisk: 0,
        overallocatedResources: 0,
      };
    }
  }
}
