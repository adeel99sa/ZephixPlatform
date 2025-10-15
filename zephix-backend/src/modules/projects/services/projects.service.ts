import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectConnection } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  In,
  Not,
  IsNull,
  Connection,
  DataSource,
} from 'typeorm';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from '../entities/project.entity';
import { ProjectAssignment } from '../entities/project-assignment.entity';
import { ProjectPhase } from '../entities/project-phase.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { CreateProjectFromTemplateDto } from '../../templates/dto/create-from-template.dto';
import { CreatePhaseDto, UpdatePhaseDto } from '../dtos/phase.dtos';
import { TenantAwareRepository } from '../../../common/decorators/tenant.decorator';
import { BaseSoftDeleteService } from '../../../common/services/base-soft-delete.service';
// import { BaseSoftDeleteService } from '../../../common/base-soft-delete.service';
// import { Workspace } from '../../workspaces/entities/workspace.entity';
// import { Folder } from '../../folders/entities/folder.entity';

// JWT User type for workspace/folder resolution
type JwtUser = {
  id: string;
  organizationId: string | null;
  workspaceId: string | null;
  role?: string;
  organizationRole?: string;
};

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly soft: BaseSoftDeleteService<Project>;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectAssignment)
    private readonly projectAssignmentRepository: Repository<ProjectAssignment>,
    @InjectRepository(ProjectPhase)
    private readonly projectPhaseRepository: Repository<ProjectPhase>,
    // @InjectRepository(Workspace)
    // private readonly workspaceRepository: Repository<Workspace>,
    // @InjectRepository(Folder)
    // private readonly folderRepository: Repository<Folder>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly dataSource: DataSource,
  ) {
    console.log('🚀 ProjectsService constructor called!');
    this.soft = new BaseSoftDeleteService<Project>(this.projectRepository);
  }

  // Add missing methods from base class
  async createLegacy(data: any, organizationId: string): Promise<Project> {
    const project = this.projectRepository.create({
      ...data,
      organizationId,
    });
    const saved = await this.projectRepository.save(project);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findById(id: string, organizationId: string): Promise<Project | null> {
    return this.soft.findById(id, organizationId);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    return this.soft.softDelete(id, userId);
  }

  async findAndCount(options: any): Promise<[Project[], number]> {
    return this.soft.findAndCount(options);
  }

  async bulkSoftDelete(ids: string[], userId: string): Promise<void> {
    await this.projectRepository.update(ids, {
      deletedAt: new Date(),
      deletedById: userId
    });
  }

  async restore(id: string): Promise<void> {
    await this.projectRepository.update(id, {
      deletedAt: null,
      deletedById: null
    });
  }

  /**
   * Main public API for creating projects - TENANT SECURE with transaction
   */
  async create(dto: CreateProjectDto, user: JwtUser): Promise<Project> {
    const qr = this.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const { workspaceId, folderId } = await this.resolveWorkspaceAndFolder(
        dto,
        user,
      );

      const entity = this.projectRepository.create({
        name: dto.name,
        description: dto.description ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        estimatedEndDate: dto.estimatedEndDate
          ? new Date(dto.estimatedEndDate)
          : null,
        organizationId: user.organizationId,
        workspaceId,
        folderId: folderId ?? null,
        createdById: user.id,
        status: dto.status || 'planning',
        priority: dto.priority || 'medium',
        riskLevel: dto.riskLevel || 'medium',
      } as any);

      const saved = await qr.manager.getRepository(Project).save(entity);
      await qr.commitTransaction();
      return this.serializeProject(Array.isArray(saved) ? saved[0] : saved);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Serialize project for API response
   */
  private serializeProject(p: Project): any {
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      startDate: p.startDate,
      estimatedEndDate: p.estimatedEndDate,
      organizationId: p.organizationId,
      workspaceId: p.workspaceId,
      folderId: p.folderId ?? null,
    };
  }

  /**
   * Resolve workspace and folder for project creation
   * Uses user's workspace from JWT if not provided in DTO
   * Creates root folder if it doesn't exist
   */
  private async resolveWorkspaceAndFolder(
    dto: CreateProjectDto,
    user: JwtUser,
  ): Promise<{ workspaceId: string; folderId: string | null }> {
    this.logger.debug(
      `resolveWorkspaceAndFolder - user:`,
      JSON.stringify(user, null, 2),
    );
    this.logger.debug(
      `resolveWorkspaceAndFolder - dto:`,
      JSON.stringify(dto, null, 2),
    );

    // 1) Resolve workspace
    const workspaceId = dto.workspaceId ?? user.workspaceId ?? null;
    this.logger.debug(
      `resolveWorkspaceAndFolder - workspaceId: ${workspaceId}`,
    );

    if (!workspaceId) {
      throw new BadRequestException(
        'No workspaceId provided and none on user context',
      );
    }

    // TODO: Add workspace validation when workspace entity is available
    // const workspace = await this.workspaceRepository.findOne({
    //   where: { id: workspaceId, organizationId: user.organizationId },
    // });
    // if (!workspace) {
    //   throw new ForbiddenException('Workspace not found in your organization');
    // }

    // TODO: Add folder validation when folder entity is available
    // 2) Resolve folder: use provided or get/create root
    // if (dto.folderId) {
    //   const folder = await this.folderRepository.findOne({
    //     where: {
    //       id: dto.folderId,
    //       workspaceId,
    //       organizationId: user.organizationId,
    //     },
    //   });
    //   if (!folder) {
    //     throw new ForbiddenException(
    //       'Folder not found in your organization/workspace',
    //     );
    //   }
    //   return { workspaceId, folderId: folder.id };
    // }

    // TODO: Add folder creation when folder entity is available
    // Race-safe root creation using unique partial index
    // let root = await this.folderRepository.findOne({
    //   where: {
    //     workspaceId,
    //     organizationId: user.organizationId,
    //     parentFolderId: null,
    //     deletedAt: null,
    //   },
    // });

    // if (!root) {
    //   try {
    //     root = this.folderRepository.create({
    //       name: 'Root',
    //       workspaceId,
    //       organizationId: user.organizationId,
    //       createdBy: user.id,
    //     });
    //     root = await this.folderRepository.save(root);
    //   } catch (e: any) {
    //     // Handle unique constraint violation (race condition)
    //     const msg = String(e?.message || '');
    //     if (
    //       msg.includes('workspace_folders_one_root_per_ws') ||
    //       msg.includes('duplicate key')
    //     ) {
    //       // Another process created the root folder, fetch it
    //       root = await this.folderRepository.findOne({
    //         where: {
    //           workspaceId,
    //           organizationId: user.organizationId,
    //           parentFolderId: null,
    //           deletedAt: null,
    //         },
    //       });
    //     } else {
    //       this.logger.error('Root folder creation failed', e?.stack || e);
    //       throw e;
    //     }
    //   }
    // }

    return { workspaceId, folderId: null };
  }

  async update(
    id: string,
    organizationId: string,
    data: any,
  ): Promise<Project> {
    await this.projectRepository.update({ id, organizationId }, data);
    return this.findById(id, organizationId);
  }

  /**
   * Create a new project - TENANT SECURE with transaction
   */
  async createProject(
    createProjectDto: CreateProjectDto,
    user: JwtUser,
  ): Promise<Project> {
    const runner = this.connection.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      this.logger.log(
        `Creating project for user: ${user.id} in org: ${user.organizationId}`,
      );

      // Resolve workspace and folder (creates root folder if needed)
      const { workspaceId, folderId } = await this.resolveWorkspaceAndFolder(
        createProjectDto,
        user,
      );

      // Read-only validation (non-blocking, flagged)
      const enableValidation = process.env.ENABLE_WS_VALIDATION === 'true';
      if (enableValidation && workspaceId) {
        const w = await this.projectRepository.query(
          'select 1 from workspaces where id = $1 limit 1', [workspaceId],
        );
        if (w.length === 0) this.logger?.warn?.(`Workspace ${workspaceId} not found`);
      }
      if (enableValidation && folderId) {
        const f = await this.projectRepository.query(
          'select 1 from workspace_folders where id = $1 limit 1', [folderId],
        );
        if (f.length === 0) this.logger?.warn?.(`Folder ${folderId} not found`);
      }

      // Convert string dates to Date objects
      const processedData = {
        name: createProjectDto.name,
        description: createProjectDto.description,
        startDate: createProjectDto.startDate
          ? new Date(createProjectDto.startDate)
          : undefined,
        estimatedEndDate: createProjectDto.estimatedEndDate
          ? new Date(createProjectDto.estimatedEndDate)
          : undefined,
        createdById: user.id,
        status: createProjectDto.status || ProjectStatus.PLANNING,
        priority: (createProjectDto.priority as any) || 'medium',
        riskLevel: (createProjectDto.riskLevel as any) || 'medium',
        workspaceId,
        folderId,
        organizationId: user.organizationId,
      };

      // Create project within transaction
      const project = runner.manager
        .getRepository(Project)
        .create(processedData as any);
      const savedProject = await runner.manager
        .getRepository(Project)
        .save(project);
      const projectResult = Array.isArray(savedProject)
        ? savedProject[0]
        : savedProject;

      // Auto-assign creator as owner within transaction
      const assignment = runner.manager
        .getRepository(ProjectAssignment)
        .create({
          projectId: projectResult.id,
          userId: user.id,
          role: 'owner',
          organizationId: user.organizationId,
        });
      await runner.manager.getRepository(ProjectAssignment).save(assignment);

      await runner.commitTransaction();

      this.logger.log(
        `✅ Project created: ${projectResult.id} in org: ${user.organizationId}, workspace: ${workspaceId}`,
      );
      return projectResult;
    } catch (error) {
      await runner.rollbackTransaction();
      this.logger.error(
        `❌ Failed to create project for user ${user.id}:`,
        error,
      );
      throw error;
    } finally {
      await runner.release();
    }
  }

  /**
   * Create a new project - TENANT SECURE (legacy signature for backward compatibility)
   */
  async createProjectLegacy(
    createProjectDto: CreateProjectDto,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    try {
      this.logger.log(
        `Creating project for org: ${organizationId}, user: ${userId}`,
      );

      // Create user object for the new API
      const user: JwtUser = {
        id: userId,
        organizationId: organizationId,
        workspaceId: createProjectDto.workspaceId || null,
      };

      // Use the main public API for project creation (it will handle date conversion)
      const project = await this.create(createProjectDto, user);

      // Auto-assign creator as owner
      await this.assignUser(project.id, userId, 'owner', organizationId);

      this.logger.log(
        `✅ Project created: ${project.id} in org: ${organizationId}`,
      );
      return project;
    } catch (error) {
      this.logger.error(
        `❌ Failed to create project for org ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a new project with phases - TENANT SECURE
   */
  async createProjectWithPhases(
    createProjectDto: CreateProjectDto,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    const projectData = createProjectDto;

    // Create user object for the new API
    const user: JwtUser = {
      id: userId,
      organizationId: organizationId,
      workspaceId: null,
    };

    // Create project using the main public API
    const project = await this.create(projectData, user);

    // Note: Phases creation removed as CreateProjectDto doesn't have phases property
    // This method is kept for backward compatibility but phases are not created

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
    } = {},
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
        // Use raw SQL for search to ensure org filter is maintained and soft-deleted are excluded
        const searchResults = await this.projectRepository
          .createQueryBuilder('project')
          .where('project.organizationId = :orgId', { orgId: organizationId })
          .andWhere('project.deletedAt IS NULL') // Exclude soft-deleted
          .andWhere(
            '(project.name ILIKE :search OR project.description ILIKE :search)',
            { search: `%${search}%` },
          )
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

      // Use base class method which automatically excludes soft-deleted
      const [projects, total] = await this.findAndCount({
        where: whereClause,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      this.logger.debug(
        `Found ${projects.length}/${total} projects for org: ${organizationId}`,
      );

      return {
        projects,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch projects for org ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find one project by ID - TENANT SECURE
   */
  async findProjectById(id: string, organizationId: string): Promise<Project> {
    try {
      const project = await this.findById(id, organizationId);

      if (!project) {
        throw new NotFoundException(
          `Project with ID ${id} not found or access denied`,
        );
      }

      // Double-check organization (paranoid security)
      if (project.organizationId !== organizationId) {
        this.logger.error(
          `🚨 SECURITY VIOLATION: Project ${id} belongs to org ${project.organizationId}, requested by org ${organizationId}`,
        );
        throw new ForbiddenException('Access denied');
      }

      return project;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch project ${id} for org ${organizationId}:`,
        error,
      );
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
    userId: string,
  ): Promise<Project> {
    try {
      this.logger.log(
        `Updating project ${id} for org: ${organizationId}, user: ${userId}`,
      );

      // Convert string dates to Date objects
      const processedData: any = {
        name: updateProjectDto.name,
        description: updateProjectDto.description,
        startDate: updateProjectDto.startDate
          ? new Date(updateProjectDto.startDate)
          : undefined,
        estimatedEndDate: updateProjectDto.estimatedEndDate
          ? new Date(updateProjectDto.estimatedEndDate)
          : undefined,
        status: updateProjectDto.status,
        priority: updateProjectDto.priority,
        riskLevel: updateProjectDto.riskLevel,
        updatedAt: new Date(),
      };

      // Remove undefined values
      Object.keys(processedData).forEach((key) => {
        if (processedData[key] === undefined) {
          delete processedData[key];
        }
      });

      const updatedProject = await this.update(
        id,
        organizationId,
        processedData,
      );

      if (!updatedProject) {
        throw new NotFoundException(
          `Project with ID ${id} not found or access denied`,
        );
      }

      this.logger.log(`✅ Project updated: ${id} in org: ${organizationId}`);
      return updatedProject;
    } catch (error) {
      this.logger.error(
        `❌ Failed to update project ${id} for org ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete project (soft delete) - TENANT SECURE
   */
  async deleteProject(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Soft deleting project ${id} for org: ${organizationId}, user: ${userId}`,
      );

      // First verify the project exists and belongs to org
      const project = await this.findById(id, organizationId);
      if (!project) {
        throw new NotFoundException(
          `Project with ID ${id} not found or access denied`,
        );
      }

      // Use soft delete instead of hard delete
      await this.softDelete(id, userId);

      this.logger.log(
        `✅ Project soft deleted: ${id} from org: ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to soft delete project ${id} for org ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Bulk delete projects (soft delete) - TENANT SECURE
   */
  async bulkDeleteProjects(
    ids: string[],
    organizationId: string,
    userId: string,
  ): Promise<{ deleted: number }> {
    try {
      this.logger.log(
        `Bulk soft deleting ${ids.length} projects for org: ${organizationId}, user: ${userId}`,
      );

      if (!ids || ids.length === 0) {
        return { deleted: 0 };
      }

      // First verify all projects exist and belong to org
      const projects = await this.projectRepository.find({
        where: { id: In(ids), organizationId },
        select: ['id'],
      });

      if (projects.length !== ids.length) {
        const foundIds = projects.map((p) => p.id);
        const missingIds = ids.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Projects not found or access denied: ${missingIds.join(', ')}`,
        );
      }

      // Use soft delete for all projects
      await this.bulkSoftDelete(ids, userId);

      this.logger.log(
        `✅ Bulk soft deleted ${ids.length} projects from org: ${organizationId}`,
      );
      return { deleted: ids.length };
    } catch (error) {
      this.logger.error(
        `❌ Failed to bulk soft delete projects for org ${organizationId}:`,
        error,
      );
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

      stats.forEach((stat) => {
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
      this.logger.error(
        `❌ Failed to get stats for org ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validate project access (utility method)
   */
  async validateProjectAccess(
    projectId: string,
    organizationId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['id', 'organizationId', 'name'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (project.organizationId !== organizationId) {
      this.logger.error(
        `🚨 SECURITY: Attempted access to project ${projectId} (org: ${project.organizationId}) by org: ${organizationId}`,
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
      this.logger.log(
        `Assigning user ${userId} to project ${projectId} with role ${role}`,
      );

      // Verify project exists and user has access
      await this.validateProjectAccess(projectId, organizationId);

      const assignment = this.projectAssignmentRepository.create({
        projectId,
        userId,
        role: role,
        organizationId,
        assignedAt: new Date(),
      });

      const savedAssignment =
        await this.projectAssignmentRepository.save(assignment);
      this.logger.log(`✅ User ${userId} assigned to project ${projectId}`);
      return savedAssignment;
    } catch (error) {
      this.logger.error(
        `❌ Failed to assign user ${userId} to project ${projectId}:`,
        error,
      );
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

      this.logger.log(
        `✅ Found ${assignments.length} assignments for project ${projectId}`,
      );
      return assignments;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch assignments for project ${projectId}:`,
        error,
      );
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
        throw new NotFoundException(
          `Assignment not found for user ${userId} in project ${projectId}`,
        );
      }

      this.logger.log(`✅ User ${userId} removed from project ${projectId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to remove user ${userId} from project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  async countByOrganization(organizationId: string): Promise<number> {
    this.logger.log(`Counting projects for organization: ${organizationId}`);
    return this.projectRepository.count({
      where: { organizationId },
    });
  }

  /**
   * Restore a soft-deleted project
   */
  async restoreProject(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    this.logger.log(`Restoring project ${id} for org ${organizationId}`);

    // First check if project exists and is soft-deleted
    const deletedProject = await this.projectRepository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: Not(IsNull()),
      },
    });

    if (!deletedProject) {
      throw new NotFoundException(
        `Project ${id} not found in trash for organization ${organizationId}`,
      );
    }

    // Restore using base class method
    await this.restore(id);

    // Return the restored project
    const restoredProject = await this.findProjectById(id, organizationId);
    if (!restoredProject) {
      throw new Error(`Failed to retrieve restored project ${id}`);
    }

    this.logger.log(`Successfully restored project ${id}`);
    return restoredProject;
  }

  /**
   * Create project from template - TENANT SECURE
   */
  async createFromTemplate(
    dto: CreateProjectFromTemplateDto,
    userId: string,
  ): Promise<Project> {
    try {
      this.logger.log(
        `🔍 Creating project from template ${dto.templateId} for user ${userId}`,
      );
      this.logger.log(`🔍 DTO data:`, JSON.stringify(dto, null, 2));

      // Validate workspace belongs to organization
      const workspace = await this.connection
        .getRepository('Workspace')
        .findOne({
          where: {
            id: dto.workspaceId,
            organizationId: dto.organizationId,
          },
        });

      if (!workspace) {
        throw new NotFoundException('Workspace not found');
      }

      // Get template configuration
      const templateConfig = this.getTemplateConfiguration(dto.templateId);

      if (!templateConfig) {
        throw new BadRequestException(`Template ${dto.templateId} not found`);
      }

      // Create project with template-specific data
      const project = this.projectRepository.create({
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        workspaceId: dto.workspaceId,
        organizationId: dto.organizationId,
        methodology: templateConfig.methodology,
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM, // Required field with default
        riskLevel: ProjectRiskLevel.MEDIUM, // Required field with default
        createdById: userId,
      });

      this.logger.log(`🔍 About to save project to database...`);
      const savedProject = await this.projectRepository.save(project);
      this.logger.log(
        `✅ Project saved successfully with ID: ${savedProject.id}`,
      );

      // Create template-specific structure (temporarily disabled for debugging)
      // await this.applyTemplateStructure(savedProject, templateConfig);

      // Auto-assign creator as owner (temporarily disabled for debugging)
      // await this.assignUser(
      //   savedProject.id,
      //   userId,
      //   'owner',
      //   dto.organizationId,
      // );

      this.logger.log(
        `✅ Project created from template: ${savedProject.id} in org: ${dto.organizationId}`,
      );
      return savedProject;
    } catch (error) {
      this.logger.error(
        `❌ Failed to create project from template for org ${dto.organizationId}:`,
        error,
      );
      throw error;
    }
  }

  private getTemplateConfiguration(templateId: string): any {
    const templates = {
      'agile-scrum': {
        methodology: 'agile',
        phases: [
          { name: 'Sprint 0 (Setup)', duration: 1 },
          { name: 'Sprint 1', duration: 2 },
          { name: 'Sprint 2', duration: 2 },
          { name: 'Sprint 3', duration: 2 },
          { name: 'Sprint 4', duration: 2 },
          { name: 'Sprint 5', duration: 2 },
        ],
        kpis: [
          { name: 'Velocity', type: 'velocity', target: 20 },
          {
            name: 'Sprint Completion Rate',
            type: 'completion_rate',
            target: 90,
          },
          { name: 'Burndown', type: 'burndown', target: 100 },
        ],
        defaultTasks: [
          { title: 'Setup development environment', phase: 'Sprint 0 (Setup)' },
          { title: 'Create product backlog', phase: 'Sprint 0 (Setup)' },
          { title: 'Define sprint goals', phase: 'Sprint 1' },
        ],
      },
      'waterfall-construction': {
        methodology: 'waterfall',
        phases: [
          { name: 'Planning', duration: 4 },
          { name: 'Design', duration: 3 },
          { name: 'Construction', duration: 12 },
          { name: 'Testing', duration: 2 },
          { name: 'Handover', duration: 1 },
        ],
        kpis: [
          { name: 'Schedule Performance Index', type: 'spi', target: 1.0 },
          { name: 'Cost Performance Index', type: 'cpi', target: 1.0 },
        ],
        defaultTasks: [],
      },
    };

    return templates[templateId] || null;
  }

  private async applyTemplateStructure(
    project: Project,
    config: any,
  ): Promise<void> {
    try {
      // Create phases
      if (config.phases && config.phases.length > 0) {
        for (let i = 0; i < config.phases.length; i++) {
          const phase = config.phases[i];
          await this.projectPhaseRepository.save({
            name: phase.name,
            projectId: project.id,
            organizationId: project.organizationId,
            order: i,
            status: 'not-started',
          });
        }
      }

      // Note: KPI creation would go here if we had a KPI entity
      // For now, we'll skip KPI creation as the entity doesn't exist yet

      this.logger.log(
        `✅ Applied template structure for project ${project.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to apply template structure for project ${project.id}:`,
        error,
      );
      throw error;
    }
  }

  private async assertOwned(projectId: string, orgId: string) {
    const owned = await this.projectRepository.exist({
      where: { id: projectId, organizationId: orgId },
    });
    if (!owned) throw new NotFoundException('Project not found');
  }

  async listPhases(projectId: string, user: { organizationId: string }) {
    await this.assertOwned(projectId, user.organizationId);
    return this.projectPhaseRepository.find({
      where: { projectId },
      order: { order: 'ASC' },
    });
  }

  async createPhase(
    dto: CreatePhaseDto,
    user: { organizationId: string; workspaceId?: string | null },
  ) {
    await this.assertOwned(dto.projectId, user.organizationId);
    const nextOrder = await this.projectPhaseRepository.count({
      where: { projectId: dto.projectId },
    });
    const phase = this.projectPhaseRepository.create({
      projectId: dto.projectId,
      organizationId: user.organizationId,
      workspaceId: user.workspaceId ?? null,
      name: dto.name,
      status: (dto.status as any) ?? 'not-started',
      order: dto.order ?? nextOrder,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      ownerUserId: dto.ownerUserId ?? null,
    });
    return this.projectPhaseRepository.save(phase);
  }

  async updatePhase(
    phaseId: string,
    user: { organizationId: string },
    dto: UpdatePhaseDto,
  ) {
    const phase = await this.projectPhaseRepository.findOne({
      where: { id: phaseId },
    });
    if (!phase) throw new NotFoundException('Phase not found');
    await this.assertOwned(phase.projectId, user.organizationId);

    Object.assign(phase, dto);
    return this.projectPhaseRepository.save(phase);
  }

  async deletePhase(phaseId: string, user: { organizationId: string }) {
    const phase = await this.projectPhaseRepository.findOne({
      where: { id: phaseId },
    });
    if (!phase) throw new NotFoundException('Phase not found');
    await this.assertOwned(phase.projectId, user.organizationId);
    await this.projectPhaseRepository.delete(phaseId);
    // Optional: recompact orders
    const remaining = await this.projectPhaseRepository.find({
      where: { projectId: phase.projectId },
      order: { order: 'ASC' },
    });
    await Promise.all(
      remaining.map((p, idx) =>
        this.projectPhaseRepository.update(p.id, { order: idx }),
      ),
    );
    return { deleted: true };
  }

  async reorderPhases(
    projectId: string,
    user: { organizationId: string },
    updates: Array<{ id: string; order: number }>,
  ) {
    await this.assertOwned(projectId, user.organizationId);
    await this.dataSource.transaction(async (trx) => {
      for (const u of updates) {
        await trx
          .getRepository(ProjectPhase)
          .update({ id: u.id, projectId }, { order: u.order });
      }
    });
    return { ok: true };
  }
}
