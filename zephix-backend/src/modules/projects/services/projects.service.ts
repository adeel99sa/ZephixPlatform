import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Project, ProjectStatus } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { TenantAwareRepository } from '../../../common/decorators/tenant.decorator';

@Injectable()
export class ProjectsService extends TenantAwareRepository<Project> {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    super(projectRepository, 'Project');
  }

  /**
   * Create a new project - TENANT SECURE
   */
  async createProject(
    createProjectDto: CreateProjectDto, 
    organizationId: string, 
    userId: string
  ): Promise<Project> {
    try {
      this.logger.log(`Creating project for org: ${organizationId}, user: ${userId}`);

      // Use parent class create method which automatically sets organizationId
      const project = await this.create({
        ...createProjectDto,
        createdById: userId,
        status: createProjectDto.status || ProjectStatus.PLANNING,
      }, organizationId);

      this.logger.log(`✅ Project created: ${project.id} in org: ${organizationId}`);
      return project;

    } catch (error) {
      this.logger.error(`❌ Failed to create project for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Find all projects for organization - TENANT SECURE
   */
  async findAllProjects(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    } = {}
  ): Promise<{
    projects: Project[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, status, search } = options;
      const skip = (page - 1) * limit;

      // Build where clause with MANDATORY org filter
      const whereClause: any = { organizationId };

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        // Use raw SQL for search to ensure org filter is maintained
        const searchResults = await this.projectRepository
          .createQueryBuilder('project')
          .where('project.organizationId = :orgId', { orgId: organizationId })
          .andWhere('(project.name ILIKE :search OR project.description ILIKE :search)', 
                   { search: `%${search}%` })
          .leftJoinAndSelect('project.createdByUser', 'user')
          .orderBy('project.createdAt', 'DESC')
          .skip(skip)
          .take(limit)
          .getManyAndCount();

        const [projects, total] = searchResults;
        
        return {
          projects,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }

      // Regular find with org filter
      const [projects, total] = await this.projectRepository.findAndCount({
        where: whereClause,
        relations: ['createdByUser'],
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      this.logger.debug(`Found ${projects.length}/${total} projects for org: ${organizationId}`);

      return {
        projects,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to fetch projects for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Find one project by ID - TENANT SECURE
   */
  async findProjectById(id: string, organizationId: string): Promise<Project> {
    try {
      const project = await this.findById(id, organizationId, [
        'createdByUser'
      ]);

      if (!project) {
        throw new NotFoundException(`Project with ID ${id} not found or access denied`);
      }

      // Double-check organization (paranoid security)
      if (project.organizationId !== organizationId) {
        this.logger.error(
          `🚨 SECURITY VIOLATION: Project ${id} belongs to org ${project.organizationId}, requested by org ${organizationId}`
        );
        throw new ForbiddenException('Access denied');
      }

      return project;

    } catch (error) {
      this.logger.error(`❌ Failed to fetch project ${id} for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Update project - TENANT SECURE
   */
  async updateProject(
    id: string, 
    updateProjectDto: UpdateProjectDto, 
    organizationId: string, 
    userId: string
  ): Promise<Project> {
    try {
      this.logger.log(`Updating project ${id} for org: ${organizationId}, user: ${userId}`);

      const updatedProject = await this.update(id, organizationId, {
        ...updateProjectDto,
        updatedAt: new Date(),
      });

      if (!updatedProject) {
        throw new NotFoundException(`Project with ID ${id} not found or access denied`);
      }

      this.logger.log(`✅ Project updated: ${id} in org: ${organizationId}`);
      return updatedProject;

    } catch (error) {
      this.logger.error(`❌ Failed to update project ${id} for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Delete project - TENANT SECURE  
   */
  async deleteProject(id: string, organizationId: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting project ${id} for org: ${organizationId}, user: ${userId}`);

      const deleted = await this.delete(id, organizationId);

      if (!deleted) {
        throw new NotFoundException(`Project with ID ${id} not found or access denied`);
      }

      this.logger.log(`✅ Project deleted: ${id} from org: ${organizationId}`);

    } catch (error) {
      this.logger.error(`❌ Failed to delete project ${id} for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Get organization statistics - TENANT SECURE
   */
  async getOrganizationStats(organizationId: string): Promise<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
  }> {
    try {
      // Use raw query with explicit org filter for better performance
      const stats = await this.projectRepository
        .createQueryBuilder('project')
        .select('project.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('project.organizationId = :orgId', { orgId: organizationId })
        .groupBy('project.status')
        .groupBy('project.status')
        .getRawMany();

      const result = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        onHoldProjects: 0,
      };

      stats.forEach(stat => {
        const count = parseInt(stat.count, 10);
        result.totalProjects += count;

        switch (stat.status) {
          case 'IN_PROGRESS':
            result.activeProjects = count;
            break;
          case 'COMPLETED':
            result.completedProjects = count;
            break;
          case 'ON_HOLD':
            result.onHoldProjects = count;
            break;
        }
      });

      return result;

    } catch (error) {
      this.logger.error(`❌ Failed to get stats for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Validate project access (utility method)
   */
  async validateProjectAccess(projectId: string, organizationId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'name'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.organizationId !== organizationId) {
      this.logger.error(
        `🚨 SECURITY: Attempted access to project ${projectId} (org: ${project.organizationId}) by org: ${organizationId}`
      );
      throw new ForbiddenException('Access denied to project');
    }

    return project;
  }
}
