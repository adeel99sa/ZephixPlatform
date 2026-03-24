import {
  Injectable,
  Optional,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
  ConflictException,
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
} from 'typeorm';
import { Request } from 'express';
import {
  Project,
  ProjectPriority,
  ProjectRiskLevel,
  ProjectStatus,
} from '../entities/project.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
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
  hasMethodologySyncFields,
} from '../helpers/governance-inheritance';
import { DomainEventEmitterService } from '../../kpi-queue/services/domain-event-emitter.service';
import { DOMAIN_EVENTS } from '../../kpi-queue/constants/queue.constants';
import { ChangeRequestEntity } from '../../change-requests/entities/change-request.entity';
import { WorkPhase } from '../../work-management/entities/work-phase.entity';
import { WorkTask } from '../../work-management/entities/work-task.entity';
import {
  PhaseGateDefinition,
  GateDefinitionStatus,
} from '../../work-management/entities/phase-gate-definition.entity';
import { TaskPriority, TaskStatus, TaskType } from '../../work-management/enums/task.enums';
import { CreateProjectFromTemplateDto } from '../dto/create-project-from-template.dto';
import { GovernanceRuleEngineService } from '../../governance-rules/services/governance-rule-engine.service';
import { GovernanceEntityType } from '../../governance-rules/entities/governance-rule-set.entity';
import {
  EvaluationDecision,
  TransitionType,
} from '../../governance-rules/entities/governance-evaluation.entity';

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

export type ProjectShareAccessLevel = 'project_manager' | 'delivery_owner';

@Injectable()
export class ProjectsService extends TenantAwareRepository<Project> {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(getTenantAwareRepositoryToken(Template))
    private readonly templateRepo: TenantAwareRepository<Template>,
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
    private configService: ConfigService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly entitlementService: EntitlementService,
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
    private readonly governanceRuleEngine?: GovernanceRuleEngineService,
  ) {
    bootLog('ProjectsService constructor called');
    super(projectRepository, 'Project');
  }

  private resolveProjectShareAccessLevel(
    accessLevel?: string,
  ): ProjectShareAccessLevel | null {
    if (!accessLevel) {
      return null;
    }
    if (accessLevel === 'project_manager' || accessLevel === 'delivery_owner') {
      return accessLevel;
    }
    throw new BadRequestException(
      'accessLevel must be project_manager or delivery_owner',
    );
  }

  private canManageProjectShare(workspaceRole: string | null): boolean {
    if (!workspaceRole) {
      return false;
    }
    return this.workspaceAccessService.hasWorkspaceRoleAtLeast(
      'workspace_owner',
      workspaceRole as any,
    );
  }

  private assertProjectHasWorkspace(project: Project): string {
    if (!project.workspaceId) {
      throw new BadRequestException(
        'Project must belong to a workspace to manage sharing',
      );
    }
    return project.workspaceId;
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

  private hasDirectProjectAccess(project: Project, userId?: string): boolean {
    if (!userId) return false;
    return (
      project.projectManagerId === userId ||
      project.deliveryOwnerUserId === userId
    );
  }

  /**
   * Centralized project read path for entity endpoints.
   * Enforces workspace visibility and project-level visibility for project-only users.
   */
  async getProjectForReadOrThrow(params: {
    id: string;
    organizationId: string;
    userId?: string;
    userRole?: string;
  }): Promise<Project> {
    const { id, organizationId, userId, userRole } = params;
    const project = await this.findById(id, organizationId, []);

    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }

    if (project.organizationId !== organizationId) {
      this.logger.error(
        `🚨 SECURITY VIOLATION: Project ${id} belongs to org ${project.organizationId}, requested by org ${organizationId}`,
      );
      throw new ForbiddenException('Access denied');
    }

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

      const workspaceRole = userId
        ? await this.workspaceAccessService.getUserWorkspaceRole(
            organizationId,
            project.workspaceId,
            userId,
            userRole,
          )
        : null;
      const isWorkspaceMember = workspaceRole !== null;

      if (!isWorkspaceMember && !this.hasDirectProjectAccess(project, userId)) {
        throw new ForbiddenException('Project access denied');
      }
    }

    return project;
  }

  async shareProjectAccess(params: {
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorUserRole?: string;
    targetUserId: string;
    accessLevel?: string;
  }): Promise<Project> {
    const {
      projectId,
      organizationId,
      actorUserId,
      actorUserRole,
      targetUserId,
      accessLevel,
    } = params;

    if (actorUserId === targetUserId) {
      throw new BadRequestException('Cannot share a project with yourself');
    }

    const project = await this.getProjectForReadOrThrow({
      id: projectId,
      organizationId,
      userId: actorUserId,
      userRole: actorUserRole,
    });
    const workspaceId = this.assertProjectHasWorkspace(project);

    const actorWorkspaceRole = await this.workspaceAccessService.getUserWorkspaceRole(
      organizationId,
      workspaceId,
      actorUserId,
      actorUserRole,
    );
    if (!this.canManageProjectShare(actorWorkspaceRole)) {
      throw new ForbiddenException(
        'Only workspace owner or organization admin can share projects',
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: {
        id: targetUserId,
        organizationId,
      },
      select: ['id', 'organizationId', 'isActive'],
    });
    if (!targetUser || !targetUser.isActive) {
      throw new NotFoundException('User not found in organization');
    }

    const targetWorkspaceRole = await this.workspaceAccessService.getUserWorkspaceRole(
      organizationId,
      workspaceId,
      targetUserId,
    );
    if (targetWorkspaceRole !== null) {
      throw new ConflictException(
        'User is already a workspace member and does not need project sharing',
      );
    }

    const normalizedAccessLevel =
      this.resolveProjectShareAccessLevel(accessLevel) ?? 'delivery_owner';

    if (normalizedAccessLevel === 'project_manager') {
      if (
        project.projectManagerId &&
        project.projectManagerId !== targetUserId
      ) {
        throw new ConflictException(
          'project_manager share slot is already assigned to another user',
        );
      }
      project.projectManagerId = targetUserId;
    } else {
      if (
        project.deliveryOwnerUserId &&
        project.deliveryOwnerUserId !== targetUserId
      ) {
        throw new ConflictException(
          'delivery_owner share slot is already assigned to another user',
        );
      }
      project.deliveryOwnerUserId = targetUserId;
    }

    return this.projectRepository.save(project);
  }

  async unshareProjectAccess(params: {
    projectId: string;
    organizationId: string;
    actorUserId: string;
    actorUserRole?: string;
    targetUserId: string;
  }): Promise<Project> {
    const {
      projectId,
      organizationId,
      actorUserId,
      actorUserRole,
      targetUserId,
    } = params;

    const project = await this.getProjectForReadOrThrow({
      id: projectId,
      organizationId,
      userId: actorUserId,
      userRole: actorUserRole,
    });
    const workspaceId = this.assertProjectHasWorkspace(project);

    const actorWorkspaceRole = await this.workspaceAccessService.getUserWorkspaceRole(
      organizationId,
      workspaceId,
      actorUserId,
      actorUserRole,
    );
    if (!this.canManageProjectShare(actorWorkspaceRole)) {
      throw new ForbiddenException(
        'Only workspace owner or organization admin can unshare projects',
      );
    }

    const wasProjectManager = project.projectManagerId === targetUserId;
    const wasDeliveryOwner = project.deliveryOwnerUserId === targetUserId;

    if (!wasProjectManager && !wasDeliveryOwner) {
      throw new NotFoundException('Project share not found for user');
    }

    if (wasProjectManager) {
      project.projectManagerId = null;
    }
    if (wasDeliveryOwner) {
      project.deliveryOwnerUserId = null;
    }

    return this.projectRepository.save(project);
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

      const queryBuilder = this.projectRepository
        .createQueryBuilder('project')
        .where('project.organizationId = :orgId', { orgId: organizationId })
        .andWhere('project.deletedAt IS NULL');

      if (status) {
        queryBuilder.andWhere('project.status = :status', { status });
      }

      if (search) {
        queryBuilder.andWhere(
          '(project.name ILIKE :search OR project.description ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      // Access filter:
      // - accessibleWorkspaceIds === null => admin/full org visibility
      // - otherwise include workspace membership visibility and direct project sharing
      if (accessibleWorkspaceIds !== null) {
        const hasWorkspaceMembership = accessibleWorkspaceIds.length > 0;
        const canUseProjectShare = !!userId;

        if (workspaceId) {
          // Requested workspace:
          // - if member of workspace => full workspace project visibility
          // - else only directly shared projects in that workspace
          if (hasWorkspaceMembership && accessibleWorkspaceIds.includes(workspaceId)) {
            queryBuilder.andWhere('project.workspaceId = :workspaceId', {
              workspaceId,
            });
          } else if (canUseProjectShare) {
            queryBuilder
              .andWhere('project.workspaceId = :workspaceId', { workspaceId })
              .andWhere(
                '(project.projectManagerId = :userId OR project.deliveryOwnerUserId = :userId)',
                { userId },
              );
          } else {
            return {
              projects: [],
              total: 0,
              page,
              totalPages: 0,
            };
          }
        } else {
          if (!hasWorkspaceMembership && !canUseProjectShare) {
            return {
              projects: [],
              total: 0,
              page,
              totalPages: 0,
            };
          }

          if (hasWorkspaceMembership && canUseProjectShare) {
            queryBuilder.andWhere(
              '(project.workspaceId IN (:...workspaceIds) OR project.projectManagerId = :userId OR project.deliveryOwnerUserId = :userId)',
              { workspaceIds: accessibleWorkspaceIds, userId },
            );
          } else if (hasWorkspaceMembership) {
            queryBuilder.andWhere('project.workspaceId IN (:...workspaceIds)', {
              workspaceIds: accessibleWorkspaceIds,
            });
          } else {
            queryBuilder.andWhere(
              '(project.projectManagerId = :userId OR project.deliveryOwnerUserId = :userId)',
              { userId },
            );
          }
        }
      } else if (workspaceId) {
        // Admin/full visibility with workspace filter
        queryBuilder.andWhere('project.workspaceId = :workspaceId', {
          workspaceId,
        });
      }

      const [projects, total] = await queryBuilder
        .orderBy('project.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

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
      return await this.getProjectForReadOrThrow({
        id,
        organizationId,
        userId,
        userRole,
      });
    } catch (error) {
      // Re-throw auth errors (403)
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        return null;
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
  ): Promise<void> {
    try {
      this.logger.log(
        `Deleting project ${id} for org: ${organizationId}, user: ${userId}`,
      );

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
        await this.ensureDefaultPhaseIfMissing(manager, saved, userId);
        return saved;
      },
    );
  }

  async createFromTemplate(
    req: Request,
    payload: CreateProjectFromTemplateDto,
  ): Promise<Project> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);
    const userRole = (req as any)?.user?.role;
    if (!userId) {
      throw new ForbiddenException('User context required');
    }

    const canAccess = await this.tenantContext.runWithTenant(
      { organizationId: orgId, workspaceId: payload.workspaceId },
      async () =>
        this.workspaceAccessService.canAccessWorkspace(
          payload.workspaceId,
          orgId,
          userId,
          userRole,
        ),
    );
    if (!canAccess) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Access denied to workspace',
      });
    }

    const workspace = await this.workspaceRepository.findOne({
      where: {
        id: payload.workspaceId,
        organizationId: orgId,
      } as any,
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const allowedTemplateIds = Array.isArray(workspace.allowedTemplateIds)
      ? workspace.allowedTemplateIds.filter(
          (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
        )
      : [];
    const hasTemplateAllowlist = allowedTemplateIds.length > 0;
    if (
      hasTemplateAllowlist &&
      !allowedTemplateIds.includes(payload.templateId)
    ) {
      throw new ForbiddenException({
        code: 'TEMPLATE_NOT_ALLOWED_FOR_WORKSPACE',
        message: 'Template is not allowed for this workspace',
      });
    }

    const template = await this.dataSource.getRepository(Template).findOne({
      where: [
        {
          id: payload.templateId,
          isSystem: true,
          isActive: true,
          isPublished: true,
          organizationId: IsNull(),
        } as any,
        {
          id: payload.templateId,
          organizationId: orgId,
          isActive: true,
          isPublished: true,
        } as any,
      ],
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    const blocks = await this.dataSource.getRepository(TemplateBlock).find({
      where: { organizationId: orgId, templateId: template.id } as any,
      order: { displayOrder: 'ASC' } as any,
    });

    // Policy-first evaluation MUST happen before any mutation.
    const policyResult = this.governanceRuleEngine
      ? await this.governanceRuleEngine.evaluate({
          organizationId: orgId,
          workspaceId: payload.workspaceId,
          entityType: GovernanceEntityType.PROJECT,
          entityId: payload.workspaceId,
          transitionType: TransitionType.STATUS_CHANGE,
          fromValue: null,
          toValue: ProjectStatus.PLANNING,
          entity: {
            name: payload.projectName.trim(),
            templateId: payload.templateId,
            workspaceId: payload.workspaceId,
            importOptions: payload.importOptions,
          },
          actor: {
            userId,
            platformRole: String((req as any)?.user?.platformRole || userRole || 'MEMBER'),
          },
          templateId: payload.templateId,
          requestId: String((req.headers['x-request-id'] as string | undefined) || ''),
        })
      : {
          decision: EvaluationDecision.ALLOW,
          reasons: [],
          evaluationId: null,
        };

    if (policyResult.decision === EvaluationDecision.BLOCK) {
      throw new ForbiddenException({
        code: 'PROJECT_CREATE_BLOCKED_BY_POLICY',
        message: 'Project creation blocked by governance policy',
        details: policyResult.reasons,
      });
    }

    const projectStartDate = payload.startDate
      ? new Date(payload.startDate)
      : null;
    const projectEndDate = payload.endDate ? new Date(payload.endDate) : null;

    return this.dataSource.transaction(async (manager) => {
      const projectRepo = manager.getRepository(Project);
      const phaseRepo = manager.getRepository(WorkPhase);
      const taskRepo = manager.getRepository(WorkTask);

      const snapshot = {
        templateId: template.id,
        templateVersion: template.version || 1,
        locked: template.lockState === 'LOCKED',
        blocks: blocks.map((b) => ({
          blockId: b.blockId,
          enabled: b.enabled,
          displayOrder: b.displayOrder,
          config: (b.config ?? {}) as Record<string, unknown>,
          locked: b.locked,
        })),
        governanceSnapshot: {
          sourceTemplateId: template.id,
          sourceTemplateVersion: template.version || 1,
          workspaceId: payload.workspaceId,
          organizationId: orgId,
          policyEvaluation: {
            decision: policyResult.decision,
            reasons: policyResult.reasons,
            evaluationId: policyResult.evaluationId,
            appliedRuleSetMeta: policyResult.appliedRuleSetMeta,
          },
          governanceConfiguration: (template as any)?.defaultGovernanceFlags ?? {},
        },
      };

      const project = projectRepo.create({
        organizationId: orgId,
        workspaceId: payload.workspaceId,
        name: payload.projectName.trim(),
        description: template.description || null,
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        riskLevel: ProjectRiskLevel.MEDIUM,
        methodology: template.methodology || 'agile',
        startDate: projectStartDate || undefined,
        endDate: projectEndDate || undefined,
        createdById: userId,
        templateId: template.id,
        templateVersion: template.version || 1,
        templateLocked: template.lockState === 'LOCKED',
        templateSnapshot: snapshot as any,
        governanceSource: 'TEMPLATE',
      } as Partial<Project>);
      const savedProject = await projectRepo.save(project);

      const phases = Array.isArray(template.phases) ? template.phases : [];
      const tasks = Array.isArray(template.taskTemplates) ? template.taskTemplates : [];

      const createdPhasesByOrder = new Map<number, WorkPhase>();
      if (payload.importOptions.includePhases) {
        for (const phase of phases) {
          const order = Number.isFinite(phase?.order) ? Number(phase.order) : 0;
          const isMilestone =
            payload.importOptions.includeMilestones &&
            String(phase?.name || '')
              .toLowerCase()
              .includes('milestone');
          const startDate = this.remapPhaseDate(
            projectStartDate,
            payload.importOptions.remapDates,
            order,
            'start',
          );
          const dueDate = this.remapPhaseDate(
            projectStartDate,
            payload.importOptions.remapDates,
            order,
            'due',
          );
          const created = phaseRepo.create({
            organizationId: orgId,
            workspaceId: payload.workspaceId,
            projectId: savedProject.id,
            programId: null,
            name: String(phase?.name || `Phase ${order + 1}`),
            sortOrder: order + 1,
            reportingKey: `PHASE-${order + 1}`,
            isMilestone,
            startDate,
            dueDate,
            sourceTemplatePhaseId: null,
            isLocked: false,
            createdByUserId: userId,
            deletedAt: null,
            deletedByUserId: null,
          });
          const savedPhase = await phaseRepo.save(created);
          createdPhasesByOrder.set(order, savedPhase);
        }
      }

      if (payload.importOptions.includeTasks) {
        for (const task of tasks) {
          const phaseOrder = Number.isFinite(task?.phaseOrder)
            ? Number(task.phaseOrder)
            : 0;
          const linkedPhase = createdPhasesByOrder.get(phaseOrder);
          const status = this.mapTemplateTaskStatus(template);
          const taskEntity = taskRepo.create({
            organizationId: orgId,
            workspaceId: payload.workspaceId,
            projectId: savedProject.id,
            parentTaskId: null,
            phaseId: linkedPhase?.id || null,
            title: String(task?.name || 'Untitled task'),
            description: task?.description ? String(task.description) : null,
            status,
            type: TaskType.TASK,
            priority: this.mapTaskPriority(task?.priority),
            assigneeUserId: null,
            reporterUserId: userId,
            startDate: payload.importOptions.remapDates
              ? this.remapTaskDate(projectStartDate, phaseOrder, 0)
              : null,
            dueDate: payload.importOptions.remapDates
              ? this.remapTaskDate(projectStartDate, phaseOrder, 2)
              : null,
            completedAt: null,
            plannedStartAt: null,
            plannedEndAt: null,
            actualStartAt: null,
            actualEndAt: null,
            percentComplete: 0,
            isMilestone: false,
            constraintType: 'asap',
            constraintDate: null,
            wbsCode: null,
            estimatePoints: null,
            estimateHours: Number.isFinite(task?.estimatedHours)
              ? Number(task.estimatedHours)
              : null,
            remainingHours: Number.isFinite(task?.estimatedHours)
              ? Number(task.estimatedHours)
              : null,
            actualHours: null,
            iterationId: null,
            committed: false,
            rank: null,
            tags: null,
            metadata: null,
            acceptanceCriteria: null,
            deletedAt: null,
            deletedByUserId: null,
          });
          await taskRepo.save(taskEntity);
        }
      }

      if (
        payload.workflow?.creation?.copyPhaseGates &&
        payload.workflow.execution?.phaseGateRules?.length
      ) {
        const gateRepo = manager.getRepository(PhaseGateDefinition);
        const seenOrders = new Set<number>();
        for (const rule of payload.workflow.execution.phaseGateRules) {
          const order = Number(rule.phaseOrder);
          if (!Number.isFinite(order) || seenOrders.has(order)) {
            continue;
          }
          const targetPhase = createdPhasesByOrder.get(order);
          if (!targetPhase) {
            continue;
          }
          seenOrders.add(order);

          const checklist =
            Array.isArray(rule.criteria) && rule.criteria.length > 0
              ? { items: rule.criteria }
              : null;

          const gateEntity = gateRepo.create({
            organizationId: orgId,
            workspaceId: payload.workspaceId,
            projectId: savedProject.id,
            phaseId: targetPhase.id,
            name:
              rule.name?.trim() ||
              `Gate: ${targetPhase.name}`,
            gateKey: `template-phase-${order}`,
            status: GateDefinitionStatus.ACTIVE,
            reviewersRolePolicy:
              Array.isArray(rule.approverRoles) && rule.approverRoles.length > 0
                ? { approverRoles: rule.approverRoles }
                : null,
            requiredDocuments: null,
            requiredChecklist: checklist,
            thresholds:
              rule.autoLock === true
                ? ({ autoLock: true } as Record<string, unknown>)
                : null,
            createdByUserId: userId,
            deletedAt: null,
          });
          await gateRepo.save(gateEntity);
        }
      }

      await manager.query(
        `INSERT INTO audit_events (
          organization_id, workspace_id, actor_user_id, actor_platform_role, actor_workspace_role,
          entity_type, entity_id, action, before_json, after_json, metadata_json, ip_address, user_agent
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          orgId,
          payload.workspaceId,
          userId,
          String((req as any)?.user?.platformRole || userRole || 'MEMBER'),
          null,
          'PROJECT',
          savedProject.id,
          'project.create_from_template',
          null,
          {
            projectId: savedProject.id,
            templateId: template.id,
            workspaceId: payload.workspaceId,
          },
          {
            policyDecision: policyResult.decision,
            policyEvaluationId: policyResult.evaluationId,
            templateVersion: template.version || 1,
            importOptions: payload.importOptions,
            requestId: req.headers['x-request-id'] || null,
          },
          (req.headers['x-forwarded-for'] as string | undefined) || null,
          (req.headers['user-agent'] as string | undefined) || null,
        ],
      );

      return savedProject;
    });
  }

  private mapTemplateTaskStatus(template: Template): TaskStatus {
    const statuses = (template.structure as any)?.includedStatuses;
    if (Array.isArray(statuses)) {
      const values = statuses.map((value: unknown) => String(value).toUpperCase());
      if (values.includes(TaskStatus.BACKLOG)) return TaskStatus.BACKLOG;
      if (values.includes(TaskStatus.TODO)) return TaskStatus.TODO;
    }
    return TaskStatus.TODO;
  }

  private mapTaskPriority(input: unknown): TaskPriority {
    const value = String(input || '').toUpperCase();
    if (value === TaskPriority.LOW) return TaskPriority.LOW;
    if (value === TaskPriority.HIGH) return TaskPriority.HIGH;
    if (value === TaskPriority.CRITICAL) return TaskPriority.CRITICAL;
    return TaskPriority.MEDIUM;
  }

  private remapPhaseDate(
    projectStartDate: Date | null,
    remapDates: boolean,
    phaseOrder: number,
    mode: 'start' | 'due',
  ): Date | null {
    if (!projectStartDate || !remapDates) return null;
    const offsetDays = mode === 'start' ? phaseOrder * 7 : phaseOrder * 7 + 5;
    const date = new Date(projectStartDate);
    date.setDate(date.getDate() + offsetDays);
    return date;
  }

  private remapTaskDate(
    projectStartDate: Date | null,
    phaseOrder: number,
    additionalOffsetDays: number,
  ): Date | null {
    if (!projectStartDate) return null;
    const date = new Date(projectStartDate);
    date.setDate(date.getDate() + phaseOrder * 7 + additionalOffsetDays);
    return date;
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
