import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  In,
  DataSource,
  DeepPartial,
} from 'typeorm';
import { Request } from 'express';
import { Project, ProjectStatus } from '../entities/project.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
// import { ProjectAssignment } from '../entities/project-assignment.entity';
// import { ProjectPhase } from '../entities/project-phase.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { TenantAwareRepository } from '../../../common/decorators/tenant.decorator';
import { ConfigService } from '@nestjs/config';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { Template } from '../../templates/entities/template.entity';
import { TemplateBlock } from '../../templates/entities/template-block.entity';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import { bootLog } from '../../../common/utils/debug-boot';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import {
  applyPortfolioGovernanceDefaults,
  hasExplicitGovernanceFlags,
} from '../helpers/governance-inheritance';

type CreateProjectV1Input = {
  name: string;
  description?: string;
  status?: any;
  workspaceId?: string;
  templateId?: string;
};

type ProjectTemplateSnapshotV1 = {
  templateId: string;
  templateVersion: number;
  blocks: Array<{
    blockId: string;
    enabled: boolean;
    displayOrder: number;
    config: Record<string, unknown>;
    locked: boolean;
  }>;
  locked: boolean;
};

@Injectable()
export class ProjectsService extends TenantAwareRepository<Project> {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @Inject(getTenantAwareRepositoryToken(Template))
    private readonly templateRepo: TenantAwareRepository<Template>,
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    private configService: ConfigService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly entitlementService: EntitlementService,
    // @InjectRepository(ProjectAssignment)
    // private readonly projectAssignmentRepository: Repository<ProjectAssignment>,
    // @InjectRepository(ProjectPhase)
    // private readonly projectPhaseRepository: Repository<ProjectPhase>,
  ) {
    bootLog('ProjectsService constructor called');
    super(projectRepository, 'Project');
  }

  private getOrgId(req: Request): string {
    const user: any = (req as any).user;
    const orgId = user?.organizationId || user?.organization_id;
    return orgId || this.tenantContext.assertOrganizationId();
  }

  private getUserId(req: Request): string | undefined {
    const user: any = (req as any).user;
    return user?.id;
  }

  /**
   * Create a new project - TENANT SECURE
   */
  async createProject(
    createProjectDto: CreateProjectDto,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    try {
      this.logger.log(
        `Creating project for org: ${organizationId}, user: ${userId}`,
      );

      // Phase 3A: Enforce project count quota
      const currentProjectCount = await this.projectRepository.count({
        where: { organizationId },
      });
      await this.entitlementService.assertWithinLimit(
        organizationId,
        'max_projects',
        currentProjectCount,
      );

      // Validate workspaceId is provided
      if (!createProjectDto.workspaceId) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'workspaceId is required',
          error: 'Bad Request',
          code: 'WORKSPACE_ID_REQUIRED',
          field: 'workspaceId',
        });
      }

      // Validate workspace belongs to organization
      const workspace = await this.workspaceRepository.findOne({
        where: { id: createProjectDto.workspaceId },
        select: ['id', 'organizationId'],
      });

      if (!workspace) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Workspace not found',
          error: 'Not Found',
          code: 'WORKSPACE_NOT_FOUND',
          field: 'workspaceId',
        });
      }

      if (workspace.organizationId !== organizationId) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Workspace does not belong to your organization',
          error: 'Forbidden',
          code: 'WORKSPACE_ORG_MISMATCH',
          field: 'workspaceId',
        });
      }

      // Use parent class create method which automatically sets organizationId
      const { phases, ...projectData } = createProjectDto;

      // Convert string dates to Date objects
      const processedData: Record<string, any> = {
        ...projectData,
        startDate: projectData.startDate
          ? new Date(projectData.startDate)
          : undefined,
        endDate: projectData.endDate
          ? new Date(projectData.endDate)
          : undefined,
        estimatedEndDate: projectData.estimatedEndDate
          ? new Date(projectData.estimatedEndDate)
          : undefined,
        createdById: userId,
        status: createProjectDto.status || ProjectStatus.PLANNING,
        workspaceId: createProjectDto.workspaceId,
      };

      // ── Wave 8B: Portfolio governance inheritance ──────────────────
      if (processedData.portfolioId && !hasExplicitGovernanceFlags(createProjectDto)) {
        try {
          const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
            where: { id: processedData.portfolioId as string },
          });
          if (portfolio) {
            applyPortfolioGovernanceDefaults(processedData, portfolio, { force: false });
            this.logger.log(`Governance inherited from portfolio ${portfolio.id}`);
          }
        } catch (govErr) {
          this.logger.warn('Portfolio governance lookup failed; using payload defaults', govErr);
        }
      }

      // Track governance source
      if (!processedData.governanceSource) {
        if (hasExplicitGovernanceFlags(createProjectDto)) {
          processedData.governanceSource = 'USER';
        }
        // TEMPLATE source is set by applyTemplateUnified path
      }

      const project = await this.create(processedData, organizationId);

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
    const { phases, ...projectData } = createProjectDto;

    // Create project
    const project = await this.createProject(
      projectData,
      organizationId,
      userId,
    );

    // Create phases if provided
    // if (phases && phases.length > 0) {
    //   for (let i = 0; i < phases.length; i++) {
    //     const phase = phases[i];
    //     await this.projectPhaseRepository.save({
    //       projectId: project.id,
    //       phaseName: phase.phaseName,
    //       orderIndex: i + 1,
    //       startDate: phase.startDate ? new Date(phase.startDate) : undefined,
    //       endDate: phase.endDate ? new Date(phase.endDate) : undefined,
    //       methodology: phase.methodology || project.methodology,
    //       status: 'not_started',
    //       isActive: i === 0 // First phase is active
    //     });
    //   }
    // }

    return project;
  }

  /**
   * Count projects by workspace - TENANT SECURE
   */
  async countByWorkspace(
    organizationId: string,
    workspaceId: string,
  ): Promise<number> {
    const count = await this.projectRepository.count({
      where: { organizationId, workspaceId: workspaceId as any },
    });
    return count;
  }

  /**
   * Find all projects for organization - TENANT SECURE
   * Respects workspace membership when feature flag is enabled
   */
  async findAllProjects(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      workspaceId?: string;
      userId?: string;
      userRole?: string;
    } = {},
  ): Promise<{
    projects: Project[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search,
        workspaceId,
        userId,
        userRole,
      } = options;
      const skip = (page - 1) * limit;

      // Get accessible workspace IDs (respects feature flag)
      const accessibleWorkspaceIds =
        await this.workspaceAccessService.getAccessibleWorkspaceIds(
          organizationId,
          userId,
          userRole,
        );

      // Build where clause with MANDATORY org filter
      const whereClause: any = { organizationId };

      // If workspace membership is enforced and user has limited access
      if (
        accessibleWorkspaceIds !== null &&
        accessibleWorkspaceIds.length === 0
      ) {
        // User has no accessible workspaces - return empty
        return {
          projects: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // Filter by accessible workspaces if membership is enforced
      if (accessibleWorkspaceIds !== null) {
        whereClause.workspaceId = In(accessibleWorkspaceIds);
      }

      if (workspaceId) {
        // If specific workspace requested, verify user has access
        if (
          accessibleWorkspaceIds !== null &&
          !accessibleWorkspaceIds.includes(workspaceId)
        ) {
          throw new ForbiddenException(
            'You do not have access to this workspace',
          );
        }
        whereClause.workspaceId = workspaceId;
      }

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        // Use query builder for search to ensure org filter and workspace membership are maintained
        const queryBuilder = this.projectRepository
          .createQueryBuilder('project')
          .where('project.organizationId = :orgId', { orgId: organizationId })
          .andWhere(
            '(project.name ILIKE :search OR project.description ILIKE :search)',
            { search: `%${search}%` },
          );

        // Apply workspace membership filter if needed
        if (accessibleWorkspaceIds !== null) {
          queryBuilder.andWhere('project.workspaceId IN (:...workspaceIds)', {
            workspaceIds: accessibleWorkspaceIds,
          });
        }

        const searchResults = await queryBuilder
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

      this.logger.debug(
        `Found ${projects.length}/${total} projects for org: ${organizationId}`,
      );

      return {
        projects: projects || [],
        total: total || 0,
        page,
        totalPages: Math.ceil((total || 0) / limit),
      };
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch projects for org ${organizationId}:`,
        error,
      );
      // Never throw - return safe defaults
      return {
        projects: [],
        total: 0,
        page: options.page || 1,
        totalPages: 0,
      };
    }
  }

  /**
   * Find one project by ID - TENANT SECURE
   * Respects workspace membership when feature flag is enabled
   */
  async findProjectById(
    id: string,
    organizationId: string,
    userId?: string,
    userRole?: string,
  ): Promise<Project | null> {
    try {
      const project = await this.findById(id, organizationId, []);

      if (!project) {
        // Return null if not found (controller will handle response format)
        return null;
      }

      // Double-check organization (paranoid security)
      if (project.organizationId !== organizationId) {
        this.logger.error(
          `🚨 SECURITY VIOLATION: Project ${id} belongs to org ${project.organizationId}, requested by org ${organizationId}`,
        );
        throw new ForbiddenException('Access denied');
      }

      // Enforce workspace membership when feature flag is enabled
      if (project.workspaceId) {
        const canAccess = await this.workspaceAccessService.canAccessWorkspace(
          project.workspaceId,
          organizationId,
          userId,
          userRole,
        );

        if (!canAccess) {
          throw new ForbiddenException(
            "You do not have access to this project's workspace",
          );
        }
      }

      return project;
    } catch (error) {
      // Re-throw auth errors (403)
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Return null for not found or other errors
      this.logger.error(
        `❌ Failed to fetch project ${id} for org ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * PHASE 6: Find project by ID in workspace - prevents existence leakage
   * Query includes id, organizationId, and workspaceId in where clause
   */
  async findByIdInWorkspace(
    projectId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Project | null> {
    try {
      const project = await this.projectRepository.findOne({
        where: {
          id: projectId,
          organizationId,
          workspaceId,
        },
      });

      return project || null;
    } catch (error) {
      this.logger.error(
        `❌ Failed to fetch project ${projectId} in workspace ${workspaceId} for org ${organizationId}:`,
        error,
      );
      return null;
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

      const { phases, ...projectData } = updateProjectDto;

      // Convert string dates to Date objects
      const processedData: Record<string, any> = {
        ...projectData,
        startDate: projectData.startDate
          ? new Date(projectData.startDate)
          : undefined,
        endDate: projectData.endDate
          ? new Date(projectData.endDate)
          : undefined,
        estimatedEndDate: projectData.estimatedEndDate
          ? new Date(projectData.estimatedEndDate)
          : undefined,
        updatedAt: new Date(),
      };

      // ── Wave 8B: Portfolio governance sync on assignment ──────────
      if (processedData.portfolioId !== undefined) {
        const syncGovernance = (updateProjectDto as any).syncGovernance === true;
        if (processedData.portfolioId && syncGovernance) {
          try {
            const portfolio = await this.dataSource.getRepository(Portfolio).findOne({
              where: { id: processedData.portfolioId as string },
            });
            if (portfolio) {
              const applied = applyPortfolioGovernanceDefaults(
                processedData,
                portfolio,
                { force: syncGovernance, onlyIfUnset: !syncGovernance },
              );
              if (applied) {
                this.logger.log(`Governance synced from portfolio ${portfolio.id} to project ${id}`);
              }
            }
          } catch (govErr) {
            this.logger.warn('Portfolio governance sync failed during update', govErr);
          }
        }
      }

      // Track governance source on explicit flag edits
      if (hasExplicitGovernanceFlags(updateProjectDto)) {
        processedData.governanceSource = 'USER';
      }

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
   * Delete project - TENANT SECURE
   */
  async deleteProject(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Deleting project ${id} for org: ${organizationId}, user: ${userId}`,
      );

      const deleted = await this.delete(id, organizationId);

      if (!deleted) {
        throw new NotFoundException(
          `Project with ID ${id} not found or access denied`,
        );
      }

      this.logger.log(`✅ Project deleted: ${id} from org: ${organizationId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete project ${id} for org ${organizationId}:`,
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
        .getRawMany()
        .catch(() => []);

      const result = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        onHoldProjects: 0,
      };

      (stats || []).forEach((stat) => {
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
      // Never throw - return safe defaults
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        onHoldProjects: 0,
      };
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

  // /**
  //  * Assign user to project - TENANT SECURE
  //  */
  // async assignUser(
  //   projectId: string,
  //   userId: string,
  //   role: string,
  //   organizationId: string,
  // ): Promise<ProjectAssignment> {
  //   try {
  //     this.logger.log(`Assigning user ${userId} to project ${projectId} with role ${role}`);

  //     // Verify project exists and user has access
  //     await this.validateProjectAccess(projectId, organizationId);

  //     const assignment = this.projectAssignmentRepository.create({
  //       projectId,
  //       userId,
  //       role: role,
  //       organizationId,
  //       assignedAt: new Date(),
  //     });

  //     const savedAssignment = await this.projectAssignmentRepository.save(assignment);
  //     this.logger.log(`✅ User ${userId} assigned to project ${projectId}`);
  //     return savedAssignment;

  //   } catch (error) {
  //     this.logger.error(`❌ Failed to assign user ${userId} to project ${projectId}:`, error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Get project assignments - TENANT SECURE
  //  */
  // async getProjectAssignments(
  //   projectId: string,
  //   organizationId: string,
  // ): Promise<ProjectAssignment[]> {
  //   try {
  //     this.logger.log(`Fetching assignments for project ${projectId}`);

  //     // Verify project exists and user has access
  //     await this.validateProjectAccess(projectId, organizationId);

  //     const assignments = await this.projectAssignmentRepository.find({
  //       where: { projectId, organizationId },
  //       order: { assignedAt: 'DESC' },
  //     });

  //     this.logger.log(`✅ Found ${assignments.length} assignments for project ${projectId}`);
  //     return assignments;

  //   } catch (error) {
  //     this.logger.error(`❌ Failed to fetch assignments for project ${projectId}:`, error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Remove user from project - TENANT SECURE
  //  */
  // async removeUser(
  //   projectId: string,
  //   userId: string,
  //   organizationId: string,
  // ): Promise<void> {
  //   try {
  //     this.logger.log(`Removing user ${userId} from project ${projectId}`);

  //     // Verify project exists and user has access
  //     await this.validateProjectAccess(projectId, organizationId);

  //     const result = await this.projectAssignmentRepository.delete({
  //       projectId,
  //       userId,
  //       organizationId,
  //     });

  //     if (result.affected === 0) {
  //       throw new NotFoundException(`Assignment not found for user ${userId} in project ${projectId}`);
  //     }

  //     this.logger.log(`✅ User ${userId} removed from project ${projectId}`);

  //   } catch (error) {
  //     this.logger.error(`❌ Failed to remove user ${userId} from project ${projectId}:`, error);
  //     throw error;
  //   }
  // }

  /**
   * Update project settings
   */
  async updateProjectSettings(
    projectId: string,
    dto: UpdateProjectDto,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Apply only settings fields from DTO
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.status !== undefined) project.status = dto.status;
    if (dto.priority !== undefined) project.priority = dto.priority;
    if (dto.startDate !== undefined) {
      project.startDate =
        typeof dto.startDate === 'string'
          ? new Date(dto.startDate)
          : dto.startDate;
    }
    if (dto.endDate !== undefined) {
      project.endDate =
        typeof dto.endDate === 'string' ? new Date(dto.endDate) : dto.endDate;
    }
    if (dto.methodology !== undefined) project.methodology = dto.methodology;
    if (dto.definitionOfDone !== undefined) {
      project.definitionOfDone = this.normalizeDoD(dto.definitionOfDone);
    }

    return this.projectRepository.save(project);
  }

  /** Normalize and validate Definition of Done items. */
  private normalizeDoD(items: string[] | undefined): string[] | null {
    if (!items || !Array.isArray(items)) return null;
    return items
      .map((s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 240))
      .filter((s) => s.length > 0)
      .slice(0, 20);
  }

  /**
   * Archive project
   */
  async archiveProject(
    projectId: string,
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Set archived status - adjust field names to match your entity
    project.status = ProjectStatus.CANCELLED; // or use isArchived if entity has it
    // If entity has archivedAt and archivedById fields, set them:
    // project.archivedAt = new Date();
    // project.archivedById = userId;

    return this.projectRepository.save(project);
  }

  // ========== Template Center v1 Method ==========

  async createWithTemplateSnapshotV1(
    req: Request,
    input: CreateProjectV1Input,
  ): Promise<Project> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);
    const userRole = (req as any)?.user?.role;

    if (!input?.name || input.name.trim().length === 0) {
      throw new BadRequestException('name is required');
    }
    if (!input?.workspaceId) {
      throw new BadRequestException('workspaceId is required');
    }
    if (!userId) {
      throw new ForbiddenException('User context required');
    }

    const canAccess = await this.tenantContext.runWithTenant(
      { organizationId: orgId, workspaceId: input.workspaceId },
      async () => {
        return this.workspaceAccessService.canAccessWorkspace(
          input.workspaceId,
          orgId,
          userId,
          userRole,
        );
      },
    );
    if (!canAccess) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Access denied to workspace',
      });
    }

    return this.dataSource.transaction<Project>(
      async (manager): Promise<Project> => {
        let template: Template | null = null;
        let blocks: TemplateBlock[] = [];

        if (input.templateId) {
          template = await manager.getRepository(Template).findOne({
            where: [
              { id: input.templateId, organizationId: orgId } as any,
              {
                id: input.templateId,
                isSystem: true,
                organizationId: null,
              } as any,
            ],
          });

          if (!template) throw new NotFoundException('Template not found');
          if (template.archivedAt)
            throw new BadRequestException('Template is archived');

          blocks = await manager.getRepository(TemplateBlock).find({
            where: { organizationId: orgId, templateId: template.id } as any,
            order: { displayOrder: 'ASC' } as any,
          });
        }

        const snapshot: ProjectTemplateSnapshotV1 | null =
          template && input.templateId
            ? {
                templateId: template.id,
                templateVersion: (template as any).version ?? 1,
                locked: (template as any).lockState === 'LOCKED',
                blocks: blocks.map((b) => ({
                  blockId: b.blockId,
                  enabled: b.enabled,
                  displayOrder: b.displayOrder,
                  config: (b.config ?? {}) as Record<string, unknown>,
                  locked: b.locked,
                })),
              }
            : null;

        const projectData: DeepPartial<Project> = {
          name: input.name.trim(),
          description: input.description,
          status: input.status || ProjectStatus.PLANNING,
          workspaceId: input.workspaceId,
          organizationId: orgId,
          createdById: userId,
          templateId: template ? template.id : null,
          templateVersion: template ? ((template as any).version ?? 1) : null,
          templateLocked: template
            ? (template as any).lockState === 'LOCKED'
            : false,
          templateSnapshot: snapshot as unknown as any,
        };

        const projectRepo = manager.getRepository(Project);
        const project: Project = projectRepo.create(projectData);
        const saved: Project = await projectRepo.save(project);
        return saved;
      },
    );
  }

  /**
   * Get available KPIs and active KPI IDs for a project
   * Available KPIs come from:
   * 1. Project's templateSnapshot (if exists)
   * 2. Project's template (if templateId exists)
   * 3. Empty array if neither exists
   */
  async getProjectKPIs(
    projectId: string,
    organizationId: string,
    userId: string,
    userRole?: string,
  ) {
    // Verify project exists and user has access
    const project = await this.findProjectById(
      projectId,
      organizationId,
      userId,
      userRole,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get available KPIs from template or templateSnapshot
    let availableKPIs: Array<{ id: string; name: string; [key: string]: any }> =
      [];

    // Priority 1: Check templateSnapshot
    if (project.templateSnapshot?.blocks) {
      for (const block of project.templateSnapshot.blocks) {
        if (block.config?.kpis) {
          availableKPIs = availableKPIs.concat(
            block.config.kpis.map((kpi: any) => ({
              id: kpi.id || kpi.name,
              name: kpi.name || kpi.id,
              ...kpi,
            })),
          );
        }
      }
    }

    // Priority 2: Check templateId and load template from unified `templates` table
    if (availableKPIs.length === 0 && project.templateId) {
      try {
        const templateRepo = this.dataSource.getRepository('Template');
        const template = await templateRepo.findOne({
          where: [
            { id: project.templateId, organizationId },
            { id: project.templateId, isSystem: true },
          ],
        });

        if (template && (template as any).defaultEnabledKPIs) {
          availableKPIs = (template as any).defaultEnabledKPIs.map(
            (kpiId: string) => ({
              id: kpiId,
              name: kpiId,
            }),
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to load template ${project.templateId} for KPIs: ${error}`,
        );
      }
    }

    return {
      availableKPIs,
      activeKpiIds: project.activeKpiIds || [],
    };
  }

  /**
   * Update active KPI IDs for a project
   * Validates that all activeKpiIds are in the available KPIs list
   */
  async updateProjectKPIs(
    projectId: string,
    activeKpiIds: string[],
    organizationId: string,
    userId: string,
  ) {
    // Verify project exists and user has access
    const project = await this.findProjectById(
      projectId,
      organizationId,
      userId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get available KPIs to validate against
    const kpiData = await this.getProjectKPIs(
      projectId,
      organizationId,
      userId,
    );

    const availableKpiIds = kpiData.availableKPIs.map((kpi) => kpi.id);

    // Validate that all activeKpiIds are in available list
    const invalidIds = activeKpiIds.filter(
      (id) => !availableKpiIds.includes(id),
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_KPI_IDS',
        message: `The following KPI IDs are not available: ${invalidIds.join(', ')}`,
      });
    }

    // Update project
    project.activeKpiIds = activeKpiIds;
    await this.projectRepository.save(project);

    return {
      activeKpiIds: project.activeKpiIds,
      availableKPIs: kpiData.availableKPIs,
    };
  }
}
