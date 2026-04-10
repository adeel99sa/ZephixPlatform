import {
  Injectable,
  Optional,
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
  IsNull,
  Not,
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
import { TemplateOriginMetadata } from '../../templates/dto/template-origin-metadata';
import { normalizeTemplateTaskPriority } from '../../templates/services/template-task-priority-normalizer';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { EntitlementService } from '../../billing/entitlements/entitlement.service';
import { PLATFORM_TRASH_RETENTION_DAYS_DEFAULT } from '../../../common/constants/platform-retention.constants';
import { bootLog } from '../../../common/utils/debug-boot';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import {
  applyPortfolioGovernanceDefaults,
  hasExplicitGovernanceFlags,
  hasMethodologySyncFields,
} from '../helpers/governance-inheritance';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';
import { ChangeRequestEntity } from '../../change-requests/entities/change-request.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import { WorkRisk } from '../../work-management/entities/work-risk.entity';
import { PhaseGateDefinition } from '../../work-management/entities/phase-gate-definition.entity';
import { WorkResourceAllocation } from '../../work-management/entities/work-resource-allocation.entity';
import { AuditService } from '../../audit/services/audit.service';
import {
  AuditAction,
  AuditEntityType,
} from '../../audit/audit.constants';
import { OrgPolicyService } from '../../../organizations/services/org-policy.service';
import { isAdminRole } from '../../../shared/enums/platform-roles.enum';

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
    private readonly auditService: AuditService,
    @Optional()
    private readonly domainEventEmitter?: DomainEventEmitterService,
    @Optional()
    private readonly methodologyConfigSync?: any,
    @Optional()
    private readonly methodologyConfigValidator?: any,
    @Optional()
    private readonly methodologyConstraints?: any,
    @Optional()
    @InjectRepository(ChangeRequestEntity)
    private readonly changeRequestRepo?: Repository<ChangeRequestEntity>,
    @Optional()
    private readonly orgPolicyService?: OrgPolicyService,
  ) {
    bootLog('ProjectsService constructor called');
    super(projectRepository, 'Project');
  }

  private static readonly SCOPE_FIELDS = new Set([
    'startDate',
    'endDate',
    'estimatedEndDate',
    'budget',
    'actualCost',
  ]);

  /**
   * When changeManagementEnabled is true and the update touches scope fields,
   * enforce that an approved change request is referenced.
   * The service loads the CR itself — callers only pass the ID.
   */
  private async assertChangeRequestForScopeUpdate(
    dto: UpdateProjectDto,
    project: Project,
  ): Promise<void> {
    if (!this.methodologyConstraints) return;

    const touchesScope = Object.keys(dto).some((k) =>
      ProjectsService.SCOPE_FIELDS.has(k),
    );
    if (!touchesScope) return;

    const cmEnabled = this.methodologyConstraints.resolveCapability(
      project,
      (c) => c?.governance?.changeManagementEnabled,
      project.changeManagementEnabled,
    );
    if (!cmEnabled) return;

    const crId = (dto as any).changeRequestId as string | undefined;
    let crStatus: string | undefined;

    if (crId && this.changeRequestRepo) {
      const cr = await this.changeRequestRepo.findOne({
        where: { id: crId },
        select: ['id', 'status'],
      });
      crStatus = cr?.status;
    }

    this.methodologyConstraints.assertChangeRequestRequired(cmEnabled, crId, crStatus);
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

  private async ensureDefaultPhaseIfMissing(
    manager: DataSource['manager'],
    project: Pick<Project, 'id' | 'organizationId' | 'workspaceId'>,
    createdByUserId: string,
  ): Promise<void> {
    const phaseRepo = manager.getRepository(WorkPhase);
    const phaseCount = await phaseRepo.count({
      where: {
        organizationId: project.organizationId,
        workspaceId: project.workspaceId as string,
        projectId: project.id,
      },
    });
    if (phaseCount > 0) return;

    const defaultPhase = phaseRepo.create({
      organizationId: project.organizationId,
      workspaceId: project.workspaceId as string,
      projectId: project.id,
      programId: null,
      name: 'Execution',
      sortOrder: 1,
      reportingKey: 'PHASE-1',
      isMilestone: false,
      startDate: null,
      dueDate: null,
      sourceTemplatePhaseId: null,
      isLocked: false,
      createdByUserId,
      deletedAt: null,
      deletedByUserId: null,
    });
    await phaseRepo.save(defaultPhase);
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
            where: { id: processedData.portfolioId as string, organizationId },
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

      // Sync legacy flags → methodology_config on newly created projects
      if (this.methodologyConfigSync) {
        await this.methodologyConfigSync.syncConfigFromLegacyFlags(
          project.id,
          organizationId,
        );
      }

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
      where: { organizationId, workspaceId: workspaceId as any, deletedAt: IsNull() as any },
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
      const whereClause: any = { organizationId, deletedAt: IsNull() };

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
          .andWhere('project.deletedAt IS NULL')
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
      if (project.deletedAt) {
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
              where: { id: processedData.portfolioId as string, organizationId },
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

      // Capture old project state for event emission and CR enforcement
      const oldProject = await this.projectRepository.findOne({
        where: { id, organizationId },
        select: ['id', 'portfolioId', 'programId', 'workspaceId', 'changeManagementEnabled'],
      });
      const oldPortfolioId = oldProject?.portfolioId;
      const oldProgramId = oldProject?.programId;

      if (oldProject) {
        await this.assertChangeRequestForScopeUpdate(updateProjectDto, oldProject);
      }

      const needsMethodologySync =
        hasMethodologySyncFields(updateProjectDto) && !!this.methodologyConfigSync;

      let updatedProject: Project | null;

      if (needsMethodologySync) {
        // Both writes in one transaction via the same QueryRunner.
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
          // Update project columns through the qr, not the default repository connection
          await qr.manager.update(
            Project,
            { id, organizationId },
            { ...processedData, organizationId },
          );
          // Sync direction: legacy flags → config. Same qr.
          await this.methodologyConfigSync!.syncConfigFromLegacyFlags(
            id,
            organizationId,
            qr,
          );
          await qr.commitTransaction();
        } catch (txErr) {
          await qr.rollbackTransaction();
          throw txErr;
        } finally {
          await qr.release();
        }
        // Re-read the committed state
        updatedProject = await this.findById(id, organizationId);
        if (!updatedProject) {
          throw new NotFoundException(
            `Project with ID ${id} not found or access denied`,
          );
        }
      } else {
        updatedProject = await this.update(id, organizationId, processedData);
        if (!updatedProject) {
          throw new NotFoundException(
            `Project with ID ${id} not found or access denied`,
          );
        }
      }

      // Wave 10: Emit portfolio/program assignment events
      if (this.domainEventEmitter && oldProject?.workspaceId) {
        const wsId = oldProject.workspaceId;
        const newPortfolioId = processedData.portfolioId;
        const newProgramId = processedData.programId;

        if (newPortfolioId !== undefined && newPortfolioId !== oldPortfolioId) {
          if (oldPortfolioId) {
            this.domainEventEmitter.emit(DOMAIN_EVENTS.PROJECT_REMOVED_FROM_PORTFOLIO, {
              workspaceId: wsId, organizationId, projectId: id, portfolioId: oldPortfolioId,
            }).catch(() => {});
          }
          if (newPortfolioId) {
            this.domainEventEmitter.emit(DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PORTFOLIO, {
              workspaceId: wsId, organizationId, projectId: id, portfolioId: newPortfolioId,
            }).catch(() => {});
          }
        }

        if (newProgramId !== undefined && newProgramId !== oldProgramId) {
          if (oldProgramId) {
            this.domainEventEmitter.emit(DOMAIN_EVENTS.PROJECT_REMOVED_FROM_PROGRAM, {
              workspaceId: wsId, organizationId, projectId: id, programId: oldProgramId,
            }).catch(() => {});
          }
          if (newProgramId) {
            this.domainEventEmitter.emit(DOMAIN_EVENTS.PROJECT_ASSIGNED_TO_PROGRAM, {
              workspaceId: wsId, organizationId, projectId: id, programId: newProgramId,
            }).catch(() => {});
          }
        }
      }

      this.logger.log(`Project updated: ${id} in org: ${organizationId}`);
      return updatedProject;
    } catch (error) {
      this.logger.error(
        `Failed to update project ${id} for org ${organizationId}:`,
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
    userRole?: string,
  ): Promise<{ id: string; trashRetentionDays: number }> {
    try {
      this.logger.log(
        `Deleting project ${id} for org: ${organizationId}, user: ${userId}`,
      );

      // P-1 + MVP-5A: Org policy enforcement — wsOwnersCanDeleteProjects
      if (this.orgPolicyService && !isAdminRole(userRole)) {
        const orgMatrix = await this.orgPolicyService.getPermissionMatrix(organizationId);
        const wsDefaults = await this.orgPolicyService.getWorkspacePermissionDefaults(organizationId);
        if (!this.orgPolicyService.isMatrixPolicyAllowed('wsOwnersCanDeleteProjects', userRole, orgMatrix, wsDefaults)) {
          throw new ForbiddenException(
            'Organization policy does not allow workspace owners to delete projects',
          );
        }
      }

      await this.dataSource.transaction(async (manager) => {
        const projectRepo = manager.getRepository(Project);
        const workTaskRepo = manager.getRepository(WorkTask);
        const now = new Date();
        const workspaceScope = this.tenantContext.getWorkspaceId();

        const projectWhere: Record<string, unknown> = {
          id,
          organizationId,
          deletedAt: IsNull() as any,
        };
        if (workspaceScope) {
          projectWhere.workspaceId = workspaceScope;
        }

        const project = await projectRepo.findOne({
          where: projectWhere as any,
          select: ['id', 'organizationId', 'workspaceId', 'name', 'deletedAt'],
        });
        if (!project) {
          throw new NotFoundException(
            `Project with ID ${id} not found or access denied`,
          );
        }
        if (!project.workspaceId) {
          throw new BadRequestException(
            'Project workspace scope is required for delete',
          );
        }

        await workTaskRepo
          .createQueryBuilder()
          .update(WorkTask)
          .set({ deletedAt: now, deletedByUserId: userId })
          .where('project_id = :projectId', { projectId: id })
          .andWhere('organization_id = :organizationId', { organizationId })
          .andWhere('workspace_id = :workspaceId', {
            workspaceId: project.workspaceId,
          })
          .andWhere('deleted_at IS NULL')
          .execute();

        await projectRepo
          .createQueryBuilder()
          .update(Project)
          .set({ deletedAt: now })
          .where('id = :projectId', { projectId: id })
          .andWhere('organization_id = :organizationId', { organizationId })
          .andWhere('workspace_id = :workspaceId', {
            workspaceId: project.workspaceId,
          })
          .andWhere('deleted_at IS NULL')
          .execute();
      });

      this.logger.log(`✅ Project deleted: ${id} from org: ${organizationId}`);

      const meta = await this.projectRepository.findOne({
        where: { id, organizationId },
        withDeleted: true,
      });
      if (meta) {
        void this.auditService
          .record({
            organizationId,
            workspaceId: meta.workspaceId ?? undefined,
            actorUserId: userId,
            actorPlatformRole: 'MEMBER',
            entityType: AuditEntityType.PROJECT,
            entityId: id,
            action: AuditAction.SOFT_REMOVE_TO_TRASH,
            metadata: { name: meta.name },
          })
          .catch(() => undefined);
      }

      return {
        id,
        trashRetentionDays: PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
      };
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

    const needsSync = dto.methodology !== undefined && !!this.methodologyConfigSync;

    if (needsSync) {
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        await qr.manager.save(project);
        await this.methodologyConfigSync!.syncConfigFromLegacyFlags(
          projectId,
          organizationId,
          qr,
        );
        await qr.commitTransaction();
      } catch (txErr) {
        await qr.rollbackTransaction();
        throw txErr;
      } finally {
        await qr.release();
      }
      const fresh = await this.projectRepository.findOne({
        where: { id: projectId, organizationId },
      });
      return fresh ?? project;
    }

    return this.projectRepository.save(project);
  }

  /**
   * Phase 3 (Template Center): Get project team member IDs.
   * Returns the explicit per-project team. PM is always implicitly included.
   */
  async getProjectTeam(
    projectId: string,
    organizationId: string,
  ): Promise<{ teamMemberIds: string[]; projectManagerId: string | null }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
      select: ['id', 'teamMemberIds' as any, 'projectManagerId' as any],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const teamIds = Array.isArray(project.teamMemberIds) ? project.teamMemberIds : [];
    const pmId = (project as any).projectManagerId ?? null;
    // Ensure PM is always part of the returned set
    const uniqueIds = pmId && !teamIds.includes(pmId) ? [pmId, ...teamIds] : teamIds;
    return {
      teamMemberIds: uniqueIds,
      projectManagerId: pmId,
    };
  }

  /**
   * Phase 3 (Template Center): Update project team member IDs.
   * Validates that all IDs are workspace members of the project's workspace.
   * PM is always implicitly part of the team — cannot be removed via this method.
   */
  async updateProjectTeam(
    projectId: string,
    organizationId: string,
    teamMemberIds: string[],
  ): Promise<{ teamMemberIds: string[] }> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (!project.workspaceId) {
      throw new BadRequestException('Project has no workspace context');
    }

    // Sanitize: dedupe + filter to valid string UUIDs
    const sanitized = Array.from(
      new Set(
        (teamMemberIds || []).filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    );

    // Validate that all IDs are real workspace members of this project's workspace
    if (sanitized.length > 0) {
      const memberCount = await this.dataSource.query(
        `SELECT COUNT(DISTINCT user_id) AS count
         FROM workspace_members
         WHERE workspace_id = $1
           AND organization_id = $2
           AND status = 'active'
           AND user_id = ANY($3::uuid[])`,
        [project.workspaceId, organizationId, sanitized],
      );
      const validCount = parseInt(memberCount[0]?.count || '0', 10);
      if (validCount !== sanitized.length) {
        throw new BadRequestException({
          code: 'INVALID_TEAM_MEMBERS',
          message: 'All team members must be active workspace members',
        });
      }
    }

    // PM is always implicitly part of the team — ensure included if set
    const pmId = (project as any).projectManagerId ?? null;
    const finalIds = pmId && !sanitized.includes(pmId) ? [pmId, ...sanitized] : sanitized;

    project.teamMemberIds = finalIds;
    await this.projectRepository.save(project);

    return { teamMemberIds: finalIds };
  }

  /**
   * Phase 4 (Template Center): Save an existing project as a WORKSPACE-scoped template.
   *
   * Snapshot scope (Option B):
   *  - phases (name, order, description)
   *  - tasks (title, description, priority, estimate, phase order)
   *  - methodology
   *  - description (template-level)
   *  - basic metadata (sourceProjectId, sourceProjectName, createdAt)
   *
   * Explicitly NOT captured: document contents, live task status, assignees,
   * dates, comments, activity history.
   *
   * Does NOT mutate the source project.
   *
   * Name collision: if a template with the same name already exists in the
   * same workspace scope, an incrementing " (n)" suffix is appended.
   */
  async saveProjectAsTemplate(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: { name?: string; description?: string },
  ): Promise<Template> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (!project.workspaceId) {
      throw new BadRequestException('Project has no workspace context');
    }

    // Load phases (sorted) — read-only, no mutation of source.
    // Phase 4.6: WorkPhase uses a plain `deleted_at` column (not
    // @DeleteDateColumn), so TypeORM does NOT auto-exclude trashed rows.
    // We must filter explicitly or saved templates would carry ghost phases.
    const phaseRepo = this.dataSource.getRepository(WorkPhase);
    const sourcePhases = await phaseRepo.find({
      where: {
        organizationId,
        workspaceId: project.workspaceId,
        projectId: project.id,
        deletedAt: IsNull(),
      },
      order: { sortOrder: 'ASC' },
    });

    // Load tasks — same soft-delete caveat as phases.
    const taskRepo = this.dataSource.getRepository(WorkTask);
    const sourceTasks = await taskRepo.find({
      where: {
        organizationId,
        workspaceId: project.workspaceId,
        projectId: project.id,
        deletedAt: IsNull(),
      },
    });

    // Phase 4.6: read source methodology_config via raw SQL.
    // The column is JSONB on `projects` but is NOT mapped on the Project
    // entity (the existing updateMethodologyConfig uses raw SQL too). We
    // mirror that pattern instead of introducing a schema change.
    let sourceMethodologyConfig: Record<string, any> | null = null;
    try {
      const rows = await this.dataSource.query(
        `SELECT methodology_config FROM projects WHERE id = $1 AND organization_id = $2`,
        [project.id, organizationId],
      );
      const raw = rows?.[0]?.methodology_config;
      if (raw && typeof raw === 'object') {
        sourceMethodologyConfig = raw;
      } else if (typeof raw === 'string') {
        try {
          sourceMethodologyConfig = JSON.parse(raw);
        } catch {
          sourceMethodologyConfig = null;
        }
      }
    } catch (err) {
      this.logger.warn({
        action: 'SAVE_AS_TEMPLATE_METHODOLOGY_CONFIG_READ_FAILED',
        projectId: project.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Phase 4.6: snapshot active KPI ids from the source project.
    const sourceActiveKpiIds = Array.isArray(project.activeKpiIds)
      ? [...project.activeKpiIds]
      : [];

    // Build phase index → order mapping for task assignment
    const phaseIdToOrder = new Map<string, number>();
    const phasesSnapshot = sourcePhases.map((p, idx) => {
      const order = idx + 1;
      phaseIdToOrder.set(p.id, order);
      return {
        name: p.name,
        order,
        description: undefined,
      };
    });

    // Phase 5A.4: capture priority via the canonical normalizer.
    // Source `t.priority` is the WorkTask DB enum (uppercase: LOW/MEDIUM/
    // HIGH/CRITICAL). The previous lowercase whitelist was an inverse
    // mismatch and silently dropped EVERY task priority to undefined,
    // because uppercase 'HIGH' never matched the lowercase whitelist.
    // The normalizer accepts both vocabularies and returns the canonical
    // uppercase enum value, which the future instantiate path can read
    // back through the same helper without any conversion drift.
    const tasksSnapshot = sourceTasks.map((t) => ({
      name: t.title,
      description: t.description ?? undefined,
      estimatedHours:
        typeof t.estimateHours === 'number'
          ? t.estimateHours
          : undefined,
      phaseOrder: t.phaseId ? phaseIdToOrder.get(t.phaseId) : undefined,
      priority: normalizeTemplateTaskPriority(t.priority) ?? undefined,
    }));

    // Resolve template name (default = source name + " Template")
    const requested =
      (dto.name && dto.name.trim()) || `${project.name} Template`;
    const finalName = await this.resolveTemplateNameCollision(
      requested,
      project.workspaceId,
      organizationId,
    );

    const templateRepo = this.dataSource.getRepository(Template);
    const entity = templateRepo.create(<any>{
      name: finalName,
      description: dto.description?.trim() || project.description || null,
      category: 'custom',
      kind: 'project',
      isActive: true,
      isSystem: false,
      organizationId,
      templateScope: 'WORKSPACE' as any,
      workspaceId: project.workspaceId,
      createdById: userId,
      updatedById: userId,
      isDefault: false,
      lockState: 'UNLOCKED' as any,
      version: 1,
      methodology: (project as any).methodology ?? null,
      phases: phasesSnapshot,
      taskTemplates: tasksSnapshot,
      // Phase 4.6: also store the source's active KPIs as the template's
      // default enabled set so instantiate can pick them up directly.
      defaultEnabledKPIs: sourceActiveKpiIds,
      metadata: {
        sourceProjectId: project.id,
        sourceProjectName: project.name,
        savedAt: new Date().toISOString(),
        savedByUserId: userId,
        methodologyConfig: sourceMethodologyConfig,
        activeKpiIds: sourceActiveKpiIds,
      } satisfies TemplateOriginMetadata,
    } as any);

    const saved: Template = await templateRepo.save(entity as any);

    this.logger.log({
      action: 'PROJECT_SAVED_AS_TEMPLATE',
      projectId: project.id,
      templateId: saved.id,
      workspaceId: project.workspaceId,
      organizationId,
      userId,
    });

    return saved;
  }

  /**
   * Phase 4.6 (Template Center hotfix): seed a duplicated project with the
   * source project's team and PM, filtered to current active workspace
   * members.
   *
   * Why: instantiate-v5_1 always seeds `[creatorUserId]` as the new team
   * (Phase 4 default). Without this, "Duplicate as project" loses the team
   * — which is not what users expect. This method runs after instantiate
   * and merges the source team back in. Members no longer in the workspace
   * are dropped silently; PM is always preserved if still a member.
   */
  async seedDuplicatedProjectTeam(
    newProjectId: string,
    organizationId: string,
    sourceTeamMemberIds: string[],
    sourceProjectManagerId: string | null,
  ): Promise<{ teamMemberIds: string[]; projectManagerId: string | null }> {
    const project = await this.projectRepository.findOne({
      where: { id: newProjectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('New project not found after instantiate');
    }
    if (!project.workspaceId) {
      // Cannot validate members without workspace context — leave defaults.
      return {
        teamMemberIds: project.teamMemberIds ?? [],
        projectManagerId: (project as any).projectManagerId ?? null,
      };
    }

    const candidateIds = Array.from(
      new Set(
        [...(sourceTeamMemberIds || []), sourceProjectManagerId].filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    );

    let validIds: string[] = [];
    if (candidateIds.length > 0) {
      const rows = await this.dataSource.query(
        `SELECT user_id
           FROM workspace_members
          WHERE workspace_id = $1
            AND organization_id = $2
            AND status = 'active'
            AND user_id = ANY($3::uuid[])`,
        [project.workspaceId, organizationId, candidateIds],
      );
      validIds = rows.map((r: any) => r.user_id);
    }

    // PM is preserved only if still an active workspace member
    const finalPm =
      sourceProjectManagerId && validIds.includes(sourceProjectManagerId)
        ? sourceProjectManagerId
        : null;

    // Final team = unique union of valid source members + creator (already
    // seeded by instantiate) + PM (always implicit)
    const existing = Array.isArray(project.teamMemberIds)
      ? project.teamMemberIds
      : [];
    const merged = Array.from(
      new Set([...existing, ...validIds, ...(finalPm ? [finalPm] : [])]),
    );

    project.teamMemberIds = merged;
    (project as any).projectManagerId = finalPm;
    await this.projectRepository.save(project);

    return { teamMemberIds: merged, projectManagerId: finalPm };
  }

  /**
   * Phase 4.5 (Template Center): archive a transient template created by the
   * unified Duplicate-as-project flow. Soft-archives by setting archived_at
   * and is_active = false so it never appears in the workspace library.
   */
  async archiveTransientTemplate(
    templateId: string,
    organizationId: string,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE templates
         SET archived_at = NOW(),
             is_active = false,
             updated_at = NOW()
       WHERE id = $1
         AND organization_id = $2`,
      [templateId, organizationId],
    );
  }

  /**
   * Phase 4: append " (n)" suffix until template name is unique within
   * the same workspace scope. Case-insensitive comparison.
   */
  private async resolveTemplateNameCollision(
    desiredName: string,
    workspaceId: string,
    organizationId: string,
  ): Promise<string> {
    const templateRepo = this.dataSource.getRepository(Template);
    const existing = await templateRepo
      .createQueryBuilder('t')
      .select(['t.name'])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.templateScope = :scope', { scope: 'WORKSPACE' })
      .getMany();

    const taken = new Set(existing.map((t) => t.name.toLowerCase()));
    if (!taken.has(desiredName.toLowerCase())) return desiredName;

    let n = 2;
    while (taken.has(`${desiredName} (${n})`.toLowerCase())) {
      n += 1;
    }
    return `${desiredName} (${n})`;
  }

  /**
   * Update methodology_config on a project.
   * Merges patch into stored config, validates, persists, then syncs legacy flags.
   * Sync direction: config → legacy flags. Never calls syncConfigFromLegacyFlags.
   * Both writes happen in a single transaction.
   */
  async updateMethodologyConfig(
    projectId: string,
    organizationId: string,
    patch: Record<string, any>,
  ): Promise<Record<string, any>> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const current = ((project as any).methodologyConfig ?? {}) as Record<string, any>;
    const merged = this.deepMerge(current, patch);

    if (this.methodologyConfigValidator) {
      this.methodologyConfigValidator.validateOrThrow(merged as any);
    }

    const canSync =
      this.methodologyConfigSync &&
      merged.governance &&
      merged.sprint &&
      merged.estimation &&
      merged.methodologyCode;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(
        `UPDATE projects SET methodology_config = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
        [JSON.stringify(merged), projectId, organizationId],
      );

      if (canSync) {
        await this.methodologyConfigSync!.syncLegacyFlags(projectId, merged as any, qr);
      }

      await qr.commitTransaction();
    } catch (txErr) {
      await qr.rollbackTransaction();
      throw txErr;
    } finally {
      await qr.release();
    }

    this.logger.log({
      action: 'METHODOLOGY_CONFIG_UPDATED',
      projectId,
      organizationId,
      patchKeys: Object.keys(patch),
      before: {
        methodologyCode: current.methodologyCode,
        sprintEnabled: current.sprint?.enabled,
        gateRequired: current.phases?.gateRequired,
        estimationType: current.estimation?.type,
      },
      after: {
        methodologyCode: merged.methodologyCode,
        sprintEnabled: merged.sprint?.enabled,
        gateRequired: merged.phases?.gateRequired,
        estimationType: merged.estimation?.type,
      },
    });

    return merged;
  }

  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
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
   * Archive = same soft-delete as delete: project + tasks go to Archive & delete until retention purge.
   */
  async archiveProject(
    projectId: string,
    organizationId: string,
    userId: string,
  ): Promise<{ id: string; trashRetentionDays: number }> {
    return this.deleteProject(projectId, organizationId, userId);
  }

  /**
   * Permanently remove projects soft-deleted longer than retention (and hard-delete their work tasks first).
   * Scoped by organizationId from admin/cron context.
   */
  async purgeOldTrashedProjects(
    organizationId: string,
    retentionDays = PLATFORM_TRASH_RETENTION_DAYS_DEFAULT,
  ): Promise<{ projectsPurged: number }> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const projectsPurged = await this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);

      const stale = await projectRepo
        .createQueryBuilder('p')
        .withDeleted()
        .where('p.organizationId = :organizationId', { organizationId })
        .andWhere('p.deletedAt IS NOT NULL')
        .andWhere('p.deletedAt < :cutoff', { cutoff })
        .getMany();

      const ids = stale.map((p) => p.id);
      if (ids.length === 0) {
        return 0;
      }

      await this.purgeProjectGraph(manager, ids, organizationId);

      return ids.length;
    });

    return { projectsPurged };
  }

  /**
   * Hard-delete the full dependency graph for one or more projects within a transaction.
   * Order follows trash_dependency_matrix.md — RESTRICT FK children first, then project.
   * CASCADE children (phases, iterations, views, rag_index, metrics) are handled by DB.
   */
  private async purgeProjectGraph(
    manager: import('typeorm').EntityManager,
    projectIds: string[],
    organizationId: string,
  ): Promise<void> {
    if (projectIds.length === 0) return;

    const taskRepo = manager.getRepository(WorkTask);
    const riskRepo = manager.getRepository(WorkRisk);
    const gateDefRepo = manager.getRepository(PhaseGateDefinition);
    const allocRepo = manager.getRepository(WorkResourceAllocation);
    const projectRepo = manager.getRepository(Project);

    // 1. Work resource allocations (RESTRICT FK → project)
    await allocRepo
      .createQueryBuilder()
      .delete()
      .from(WorkResourceAllocation)
      .where('"project_id" IN (:...ids)', { ids: projectIds })
      .execute();

    // 2. Phase gate definitions (RESTRICT FK → project; cascades to gate_approval_chains)
    await gateDefRepo
      .createQueryBuilder()
      .delete()
      .from(PhaseGateDefinition)
      .where('"project_id" IN (:...ids)', { ids: projectIds })
      .execute();

    // 3. Work risks (RESTRICT FK → project)
    await riskRepo
      .createQueryBuilder()
      .delete()
      .from(WorkRisk)
      .where('"project_id" IN (:...ids)', { ids: projectIds })
      .execute();

    // 4. Work tasks (RESTRICT FK → project; task_dependencies and task_comments CASCADE from task)
    await taskRepo
      .createQueryBuilder()
      .delete()
      .from(WorkTask)
      .where('"project_id" IN (:...ids)', { ids: projectIds })
      .execute();

    // 5. Project (phases, iterations, project_views, rag_index, materialized_project_metrics CASCADE)
    await projectRepo
      .createQueryBuilder()
      .delete()
      .from(Project)
      .where('id IN (:...ids)', { ids: projectIds })
      .andWhere('"organization_id" = :organizationId', { organizationId })
      .execute();
  }

  /**
   * Projects currently in Archive & delete (soft-deleted) for an organization.
   */
  async listTrashedProjects(organizationId: string): Promise<Project[]> {
    return this.projectRepository.find({
      where: { organizationId, deletedAt: Not(IsNull()) },
      withDeleted: true,
      order: { deletedAt: 'DESC' },
    });
  }

  /**
   * Restore project from trash. Restores tasks that were soft-deleted in the same removal
   * as the project (matching deleted_at timestamp) so separately trashed tasks stay trashed.
   */
  async restoreProject(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<{ id: string }> {
    await this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const workTaskRepo = manager.getRepository(WorkTask);

      const project = await projectRepo.findOne({
        where: { id, organizationId },
        withDeleted: true,
      });
      if (!project?.deletedAt) {
        throw new NotFoundException(
          `Project with ID ${id} not found in trash or access denied`,
        );
      }
      if (!project.workspaceId) {
        throw new BadRequestException(
          'Project workspace scope is required for restore',
        );
      }

      const ts = project.deletedAt;
      await workTaskRepo
        .createQueryBuilder()
        .update(WorkTask)
        .set({ deletedAt: null, deletedByUserId: null })
        .where('project_id = :projectId', { projectId: id })
        .andWhere('organization_id = :organizationId', { organizationId })
        .andWhere('workspace_id = :workspaceId', {
          workspaceId: project.workspaceId,
        })
        .andWhere('deleted_at = :ts', { ts })
        .execute();

      await projectRepo.restore({ id, organizationId });
    });

    void this.auditService
      .record({
        organizationId,
        workspaceId: undefined,
        actorUserId: userId,
        actorPlatformRole: 'MEMBER',
        entityType: AuditEntityType.PROJECT,
        entityId: id,
        action: AuditAction.RESTORE_FROM_TRASH,
        metadata: { source: 'projects_service' },
      })
      .catch(() => undefined);

    return { id };
  }

  /**
   * Permanently delete one soft-deleted project (e.g. admin trash). Hard-deletes tasks first.
   */
  async purgeTrashedProjectById(
    organizationId: string,
    projectId: string,
    actorUserId: string,
  ): Promise<{ id: string }> {
    await this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);

      const project = await projectRepo.findOne({
        where: { id: projectId, organizationId },
        withDeleted: true,
      });
      if (!project?.deletedAt) {
        throw new NotFoundException(
          `Project ${projectId} not in trash or not found`,
        );
      }

      await this.purgeProjectGraph(manager, [projectId], organizationId);
    });

    void this.auditService
      .record({
        organizationId,
        workspaceId: undefined,
        actorUserId: actorUserId,
        actorPlatformRole: 'ADMIN',
        entityType: AuditEntityType.PROJECT,
        entityId: projectId,
        action: AuditAction.PERMANENT_DELETE_FROM_TRASH,
        metadata: { source: 'admin_trash' },
      })
      .catch(() => undefined);

    return { id: projectId };
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
        await this.ensureDefaultPhaseIfMissing(manager, saved, userId);
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
