import { Injectable, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Project, ProjectStatus } from '../entities/project.entity';
import { ProjectAssignment } from '../entities/project-assignment.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { TenantAwareRepository } from '../../../common/decorators/tenant.decorator';

@Injectable()
export class ProjectsService extends TenantAwareRepository<Project> {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectAssignment)
    private readonly projectAssignmentRepository: Repository<ProjectAssignment>,
    @InjectRepository(ProjectPhase)
    private readonly projectPhaseRepository: Repository<ProjectPhase>,
  ) {
    console.log('🚀 ProjectsService constructor called!');
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
      const { phases, ...projectData } = createProjectDto;
      
      // Convert string dates to Date objects
      const processedData = {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : undefined,
        endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
        estimatedEndDate: projectData.estimatedEndDate ? new Date(projectData.estimatedEndDate) : undefined,
        createdById: userId,
        status: createProjectDto.status || ProjectStatus.PLANNING,
      };
      
      const project = await this.create(processedData, organizationId);

      // Auto-assign creator as owner
      await this.assignUser(
        project.id,
        userId,
        'owner',
        organizationId,
      );

      this.logger.log(`✅ Project created: ${project.id} in org: ${organizationId}`);
      return project;

    } catch (error) {
      this.logger.error(`❌ Failed to create project for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new project with phases - TENANT SECURE
   */
  async createProjectWithPhases(createProjectDto: CreateProjectDto, organizationId: string, userId: string): Promise<Project> {
    const { phases, ...projectData } = createProjectDto;
    
    // Create project
    const project = await this.createProject(projectData, organizationId, userId);

    // Create phases if provided
    if (phases && phases.length > 0) {
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        await this.projectPhaseRepository.save({
          projectId: project.id,
          phaseName: phase.phaseName,
          orderIndex: i + 1,
          startDate: phase.startDate ? new Date(phase.startDate) : undefined,
          endDate: phase.endDate ? new Date(phase.endDate) : undefined,
          methodology: phase.methodology || project.methodology,
          status: 'not_started',
          isActive: i === 0 // First phase is active
        });
      }
    }

    return project;
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
      const project = await this.findById(id, organizationId, []);

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

      const { phases, ...projectData } = updateProjectDto;
      
      // Convert string dates to Date objects
      const processedData = {
        ...projectData,
        startDate: projectData.startDate ? new Date(projectData.startDate) : undefined,
        endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
        estimatedEndDate: projectData.estimatedEndDate ? new Date(projectData.estimatedEndDate) : undefined,
        updatedAt: new Date(),
      };
      
      const updatedProject = await this.update(id, organizationId, processedData);

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

  /**
   * Assign user to project - TENANT SECURE
   */
  async assignUser(
    projectId: string,
    userId: string,
    role: string,
    organizationId: string,
  ): Promise<ProjectAssignment> {
    try {
      this.logger.log(`Assigning user ${userId} to project ${projectId} with role ${role}`);

      // Verify project exists and user has access
      await this.validateProjectAccess(projectId, organizationId);

      const assignment = this.projectAssignmentRepository.create({
        projectId,
        userId,
        role: role,
        organizationId,
        assignedAt: new Date(),
      });

      const savedAssignment = await this.projectAssignmentRepository.save(assignment);
      this.logger.log(`✅ User ${userId} assigned to project ${projectId}`);
      return savedAssignment;

    } catch (error) {
      this.logger.error(`❌ Failed to assign user ${userId} to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get project assignments - TENANT SECURE
   */
  async getProjectAssignments(
    projectId: string,
    organizationId: string,
  ): Promise<ProjectAssignment[]> {
    try {
      this.logger.log(`Fetching assignments for project ${projectId}`);

      // Verify project exists and user has access
      await this.validateProjectAccess(projectId, organizationId);

      const assignments = await this.projectAssignmentRepository.find({
        where: { projectId, organizationId },
        order: { assignedAt: 'DESC' },
      });

      this.logger.log(`✅ Found ${assignments.length} assignments for project ${projectId}`);
      return assignments;

    } catch (error) {
      this.logger.error(`❌ Failed to fetch assignments for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Remove user from project - TENANT SECURE
   */
  async removeUser(
    projectId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      this.logger.log(`Removing user ${userId} from project ${projectId}`);

      // Verify project exists and user has access
      await this.validateProjectAccess(projectId, organizationId);

      const result = await this.projectAssignmentRepository.delete({
        projectId,
        userId,
        organizationId,
      });

      if (result.affected === 0) {
        throw new NotFoundException(`Assignment not found for user ${userId} in project ${projectId}`);
      }

      this.logger.log(`✅ User ${userId} removed from project ${projectId}`);

    } catch (error) {
      this.logger.error(`❌ Failed to remove user ${userId} from project ${projectId}:`, error);
      throw error;
    }
  }
}
