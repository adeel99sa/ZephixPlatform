import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { ProjectTemplate } from '../entities/project-template.entity';
import { Template } from '../entities/template.entity';
import { TemplateBlock } from '../entities/template-block.entity';
import { LegoBlock } from '../entities/lego-block.entity';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectRiskLevel,
} from '../../projects/entities/project.entity';
import { Task } from '../../projects/entities/task.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import {
  PlatformRole,
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';

type LockState = 'UNLOCKED' | 'LOCKED';

type ListV1Params = {
  isDefault?: boolean;
  isSystem?: boolean;
  lockState?: LockState;
  includeBlocks?: boolean;
  includeArchived?: boolean;
};

type CreateV1Dto = {
  name: string;
  description?: string;
  category?: string;
  kind?: 'project' | 'board' | 'mixed';
  icon?: string;
  isDefault?: boolean;
  metadata?: any;
  templateScope?: 'SYSTEM' | 'ORG' | 'WORKSPACE';
  workspaceId?: string; // Optional, will be set from x-workspace-id header for WORKSPACE scope
  structure?: Record<string, any>;
  defaultEnabledKPIs?: string[];
};

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(ProjectTemplate))
    private templateRepository: TenantAwareRepository<ProjectTemplate>,
    @Inject(getTenantAwareRepositoryToken(Template))
    private readonly templateRepo: TenantAwareRepository<Template>,
    private readonly dataSource: DataSource,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * Validate template scope rules
   * SYSTEM: organizationId must be null, workspaceId must be null
   * ORG: organizationId required, workspaceId must be null
   * WORKSPACE: organizationId required, workspaceId required
   */
  private validateTemplateScope(
    templateScope: 'SYSTEM' | 'ORG' | 'WORKSPACE',
    organizationId: string | null,
    workspaceId: string | null,
  ): void {
    if (templateScope === 'SYSTEM') {
      if (organizationId !== null) {
        throw new BadRequestException(
          'SYSTEM templates must have organizationId = null',
        );
      }
      if (workspaceId !== null) {
        throw new BadRequestException(
          'SYSTEM templates must have workspaceId = null',
        );
      }
    } else if (templateScope === 'ORG') {
      if (!organizationId) {
        throw new BadRequestException('ORG templates must have organizationId');
      }
      if (workspaceId !== null) {
        throw new BadRequestException(
          'ORG templates must have workspaceId = null',
        );
      }
    } else if (templateScope === 'WORKSPACE') {
      if (!organizationId) {
        throw new BadRequestException(
          'WORKSPACE templates must have organizationId',
        );
      }
      if (!workspaceId) {
        throw new BadRequestException(
          'WORKSPACE templates must have workspaceId',
        );
      }
    }
  }

  /**
   * Create a new template
   */
  async create(
    dto: CreateTemplateDto,
    userId: string,
    organizationId: string,
  ): Promise<ProjectTemplate> {
    // If setting as default, unset other defaults in the same scope
    if (dto.isDefault) {
      const scope = dto.scope || 'organization';
      const orgId = this.tenantContextService.assertOrganizationId();
      // Use tenant-aware query builder - organizationId filter is automatic
      await this.templateRepository
        .qb('template')
        .update(ProjectTemplate)
        .set({ isDefault: false })
        .andWhere('template.scope = :scope', { scope })
        .andWhere('template.isDefault = :isDefault', { isDefault: true })
        .execute();
    }

    const template = this.templateRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
      scope: dto.scope || 'organization',
      phases: dto.phases || [],
      taskTemplates: dto.taskTemplates || [],
      availableKPIs: dto.availableKPIs || [],
      defaultEnabledKPIs: dto.defaultEnabledKPIs || [],
      riskPresets: dto.riskPresets || [], // Phase 5
      kpiPresets: dto.kpiPresets || [], // Phase 5
      isActive: true, // New templates are active by default
    });

    return this.templateRepository.save(template);
  }

  /**
   * List all templates accessible to the organization
   * Phase 4: Extended with filters
   * Never throws - returns empty array on error or empty tables
   */
  async findAll(
    organizationId: string,
    scope?: 'organization' | 'team' | 'personal',
    filters?: {
      category?: string;
      kind?: 'project' | 'board' | 'mixed';
      search?: string;
      isActive?: boolean;
      methodology?: string;
    },
  ): Promise<ProjectTemplate[]> {
    try {
      // organizationId now comes from tenant context
      const orgId = this.tenantContextService.assertOrganizationId();

      // Use tenant-aware query builder - organizationId filter is automatic for non-system templates
      const queryBuilder = this.templateRepository.qb('template');

      // Base conditions: system templates (accessible to all) OR org templates (auto-scoped)
      queryBuilder.where(
        '(template.isSystem = :isSystem AND template.isActive = :isActive) OR (template.isActive = :isActive)',
        {
          isSystem: true,
          isActive: true,
        },
      );

      // Scope filter
      if (scope) {
        queryBuilder.andWhere('template.scope = :scope', { scope });
      }

      // Phase 4: Additional filters
      if (filters?.category) {
        // TODO: Phase 4 - Add category field to ProjectTemplate or join with Template entity
        // For now, this is a placeholder
      }

      if (filters?.methodology) {
        queryBuilder.andWhere('template.methodology = :methodology', {
          methodology: filters.methodology,
        });
      }

      if (filters?.isActive !== undefined) {
        queryBuilder.andWhere('template.isActive = :filterIsActive', {
          filterIsActive: filters.isActive,
        });
      }

      // Search filter (name or description)
      if (filters?.search) {
        queryBuilder.andWhere(
          '(template.name ILIKE :search OR template.description ILIKE :search)',
          { search: `%${filters.search}%` },
        );
      }

      queryBuilder.orderBy('template.isSystem', 'DESC');
      queryBuilder.addOrderBy('template.isDefault', 'DESC');
      queryBuilder.addOrderBy('template.createdAt', 'DESC');

      const templates = await queryBuilder.getMany();
      // Return empty array if no templates found (safe default)
      return templates || [];
    } catch (error) {
      // Never throw - return empty array on any error
      // Logging is handled at controller level
      return [];
    }
  }

  /**
   * Get a single template by ID with organization check
   */
  async findOne(id: string, organizationId: string): Promise<ProjectTemplate> {
    // organizationId parameter kept for backward compatibility
    const orgId = this.tenantContextService.assertOrganizationId();

    // Try system template first (accessible to all)
    const systemTemplate = await this.templateRepository.findOne({
      where: { id, isSystem: true, isActive: true },
    });

    if (systemTemplate) {
      return systemTemplate;
    }

    // Then try org template (auto-scoped by TenantAwareRepository)
    const orgTemplate = await this.templateRepository.findOne({
      where: { id, isActive: true },
    });

    if (!orgTemplate) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return orgTemplate;
  }

  /**
   * Update a template
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateTemplateDto,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(id, organizationId);

    // Prevent editing system templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot edit system templates');
    }

    // Ensure organization matches (skip check for system templates)
    if (!template.isSystem && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Cannot edit templates from other organizations',
      );
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      const scope = dto.scope || template.scope;
      await this.templateRepository
        .createQueryBuilder()
        .update(ProjectTemplate)
        .set({ isDefault: false })
        .where('organizationId = :organizationId', { organizationId })
        .andWhere('scope = :scope', { scope })
        .andWhere('isDefault = :isDefault', { isDefault: true })
        .andWhere('id != :id', { id })
        .execute();
    }

    // Phase 5: Validate preset arrays size (basic sanity check)
    if (dto.riskPresets && dto.riskPresets.length > 100) {
      throw new BadRequestException(
        'Risk presets array cannot exceed 100 items',
      );
    }
    if (dto.kpiPresets && dto.kpiPresets.length > 100) {
      throw new BadRequestException(
        'KPI presets array cannot exceed 100 items',
      );
    }

    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  /**
   * Soft delete a template
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const template = await this.findOne(id, organizationId);

    // Prevent deleting system templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot delete system templates');
    }

    // Ensure organization matches (skip check for system templates)
    if (!template.isSystem && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Cannot delete templates from other organizations',
      );
    }

    await this.templateRepository.remove(template);
  }

  /**
   * Archive a template (soft delete by setting isActive to false)
   */
  async archive(id: string, organizationId: string): Promise<void> {
    const template = await this.findOne(id, organizationId);

    // Prevent archiving system templates
    if (template.isSystem) {
      throw new ForbiddenException('Cannot archive system templates');
    }

    // Ensure organization matches (skip check for system templates)
    if (!template.isSystem && template.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Cannot archive templates from other organizations',
      );
    }

    template.isActive = false;
    await this.templateRepository.save(template);
  }

  /**
   * Set a template as organization-wide default
   */
  async setAsDefault(
    id: string,
    organizationId: string,
  ): Promise<ProjectTemplate> {
    const template = await this.findOne(id, organizationId);

    // Unset other defaults in the same scope
    await this.templateRepository
      .createQueryBuilder()
      .update(ProjectTemplate)
      .set({ isDefault: false })
      .where('organizationId = :organizationId', { organizationId })
      .andWhere('scope = :scope', { scope: template.scope })
      .andWhere('isDefault = :isDefault', { isDefault: true })
      .execute();

    template.isDefault = true;
    return this.templateRepository.save(template);
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<ProjectTemplate> {
    const sourceTemplate = await this.findOne(id, organizationId);

    const clonedTemplate = this.templateRepository.create({
      name: `${sourceTemplate.name} (Copy)`,
      description: sourceTemplate.description,
      methodology: sourceTemplate.methodology,
      phases: [...sourceTemplate.phases],
      taskTemplates: [...sourceTemplate.taskTemplates],
      availableKPIs: [...sourceTemplate.availableKPIs],
      defaultEnabledKPIs: [...sourceTemplate.defaultEnabledKPIs],
      scope: sourceTemplate.scope,
      teamId: sourceTemplate.teamId,
      organizationId,
      createdById: userId,
      isDefault: false,
      isSystem: false, // Cloned templates are never system templates
    });

    return this.templateRepository.save(clonedTemplate);
  }

  /**
   * Apply a template to create a new project with phases and tasks
   * All operations are wrapped in a transaction for atomicity
   */
  async applyTemplate(
    templateId: string,
    payload: {
      name: string;
      workspaceId: string;
      startDate?: Date;
      description?: string;
    },
    organizationId: string,
    userId: string,
  ): Promise<Project> {
    return this.dataSource.transaction(async (manager) => {
      const templateRepo = manager.getRepository(ProjectTemplate);
      const workspaceRepo = manager.getRepository(Workspace);
      const projectRepo = manager.getRepository(Project);
      const taskRepo = manager.getRepository(Task);

      // 1. Load template by id and organizationId, isActive true
      const template = await templateRepo.findOne({
        where: [
          { id: templateId, isSystem: true, isActive: true },
          { id: templateId, organizationId, isActive: true },
        ],
      });

      if (!template) {
        throw new NotFoundException(
          `Template with ID ${templateId} not found or not active`,
        );
      }

      // Verify template belongs to organization (skip check for system templates)
      if (!template.isSystem && template.organizationId !== organizationId) {
        throw new ForbiddenException(
          'Template does not belong to your organization',
        );
      }

      // 2. Load workspace by payload.workspaceId and organizationId
      const workspace = await workspaceRepo.findOne({
        where: { id: payload.workspaceId },
        select: ['id', 'organizationId'],
      });

      if (!workspace) {
        throw new NotFoundException(
          `Workspace with ID ${payload.workspaceId} not found`,
        );
      }

      if (workspace.organizationId !== organizationId) {
        throw new ForbiddenException(
          'Workspace does not belong to your organization',
        );
      }

      // 3. Create project row
      // Match the structure used in ProjectsService.createProject
      const project = projectRepo.create({
        name: payload.name,
        description: payload.description || null,
        workspaceId: payload.workspaceId,
        organizationId: organizationId,
        createdById: userId,
        status: ProjectStatus.PLANNING,
        priority: ProjectPriority.MEDIUM,
        riskLevel: ProjectRiskLevel.MEDIUM,
        methodology: template.methodology || 'agile',
        startDate: payload.startDate || undefined,
      });

      const savedProject = await projectRepo.save(project);

      // 4. Create tasks from template.structure.taskTemplates, if present
      // Note: Phase entity does not exist, so we skip phase creation
      if (template.taskTemplates && template.taskTemplates.length > 0) {
        // Get count of existing tasks for this project to generate unique task numbers
        const existingTaskCount = await taskRepo.count({
          where: { projectId: savedProject.id },
        });

        const tasksToCreate = template.taskTemplates.map(
          (taskTemplate, index) => {
            const taskData: any = {
              projectId: savedProject.id,
              title: taskTemplate.name,
              description: taskTemplate.description || null,
              estimatedHours: taskTemplate.estimatedHours || 0,
              priority: taskTemplate.priority || 'medium',
              status: 'not_started',
              taskNumber: `TASK-${existingTaskCount + index + 1}`,
              taskType: 'task',
              assignmentType: 'internal',
              progressPercentage: 0,
              isMilestone: false,
              isBlocked: false,
              createdById: userId,
              // phaseId is not set since Phase entity doesn't exist
              // phaseOrder from template is ignored for now
            };

            // Add organizationId - database requires it even though entity doesn't define it
            // Use snake_case to match database column name
            if (savedProject.organizationId) {
              taskData.organization_id = savedProject.organizationId;
            }

            return taskData;
          },
        );

        // Create and save tasks using repository.insert() with explicit organization_id
        // (Entity doesn't define organizationId but database requires it)
        // Use insert() which allows fields not in entity definition
        const taskInserts = tasksToCreate.map((taskData) => ({
          projectId: savedProject.id,
          title: taskData.title,
          description: taskData.description || null,
          estimatedHours: taskData.estimatedHours || 0,
          priority: taskData.priority || 'medium',
          status: taskData.status || 'not_started',
          taskNumber: taskData.taskNumber,
          taskType: taskData.taskType || 'task',
          assignmentType: taskData.assignmentType || 'internal',
          progressPercentage: taskData.progressPercentage || 0,
          isMilestone: taskData.isMilestone || false,
          isBlocked: taskData.isBlocked || false,
          createdById: taskData.createdById || null,
          // Explicitly include organization_id even though entity doesn't define it
          // TypeORM insert() will include this in the SQL
          organization_id: savedProject.organizationId,
        }));

        // Use insert() instead of query() - requires tenant-safe transaction helper refactor
        await taskRepo.insert(taskInserts);
      }

      // 5. Template usage tracking - skip if no usage entity exists
      // (No TemplateUsage entity found in codebase)

      return savedProject;
    });
  }

  // ========== Template Center v1 Methods ==========

  private getOrgId(req: Request): string {
    const user: any = (req as any).user;
    const orgId = user?.organizationId || user?.organization_id;
    return orgId || this.tenantContextService.assertOrganizationId();
  }

  private getUserId(req: Request): string | undefined {
    const user: any = (req as any).user;
    return user?.id;
  }

  async listV1(
    req: Request,
    params: ListV1Params = {},
    workspaceId: string | null = null,
  ) {
    const orgId = this.getOrgId(req);

    // workspaceId is now passed from controller (already validated)

    const qb = this.templateRepo.createQueryBuilder('t').where(
      // SYSTEM templates: organizationId is null
      '(t.templateScope = :systemScope AND t.organizationId IS NULL) OR ' +
        // ORG templates: organizationId matches
        '(t.templateScope = :orgScope AND t.organizationId = :orgId) OR ' +
        // WORKSPACE templates: organizationId matches AND workspaceId matches (if header present)
        (workspaceId
          ? '(t.templateScope = :workspaceScope AND t.organizationId = :orgId AND t.workspaceId = :workspaceId)'
          : '1=0'), // If no workspace header, exclude WORKSPACE templates
      {
        systemScope: 'SYSTEM',
        orgScope: 'ORG',
        workspaceScope: 'WORKSPACE',
        orgId,
        workspaceId,
      },
    );

    if (!params.includeArchived) {
      qb.andWhere('t.archivedAt IS NULL');
    }

    if (typeof params.isDefault === 'boolean') {
      qb.andWhere('t.isDefault = :isDefault', { isDefault: params.isDefault });
    }

    if (typeof params.isSystem === 'boolean') {
      qb.andWhere('t.isSystem = :isSystem', { isSystem: params.isSystem });
    }

    if (params.lockState) {
      qb.andWhere('t.lockState = :lockState', { lockState: params.lockState });
    }

    qb.orderBy('t.isDefault', 'DESC').addOrderBy('t.updatedAt', 'DESC');

    const templates = await qb.getMany();

    if (!params.includeBlocks) {
      return templates;
    }

    const templateIds = templates.map((t) => t.id);
    if (templateIds.length === 0) return templates;

    const rows = await this.dataSource
      .getRepository(TemplateBlock)
      .createQueryBuilder('tb')
      .innerJoin(LegoBlock, 'lb', 'lb.id = tb.blockId')
      .select([
        'tb.templateId as template_id',
        'tb.blockId as block_id',
        'tb.enabled as enabled',
        'tb.displayOrder as display_order',
        'tb.config as config',
        'tb.locked as locked',
        'lb.id as lb_id',
        'lb.key as lb_key',
        'lb.name as lb_name',
        'lb.type as lb_type',
        'lb.category as lb_category',
        'lb.description as lb_description',
        'lb.surface as lb_surface',
        'lb.minRoleToAttach as lb_min_role_to_attach',
        'lb.isActive as lb_is_active',
      ])
      .where('tb.organizationId = :orgId', { orgId })
      .andWhere('tb.templateId IN (:...templateIds)', { templateIds })
      .orderBy('tb.displayOrder', 'ASC')
      .getRawMany();

    const byTemplate: Record<string, any[]> = {};
    for (const r of rows) {
      const tid = r.template_id;
      if (!byTemplate[tid]) byTemplate[tid] = [];
      byTemplate[tid].push({
        blockId: r.block_id,
        enabled: r.enabled,
        displayOrder: r.display_order,
        config: r.config,
        locked: r.locked,
        block: {
          id: r.lb_id,
          key: r.lb_key,
          name: r.lb_name,
          type: r.lb_type,
          category: r.lb_category,
          description: r.lb_description,
          surface: r.lb_surface,
          minRoleToAttach: r.lb_min_role_to_attach,
          isActive: r.lb_is_active,
        },
      });
    }

    return templates.map((t: any) => ({
      ...t,
      blocks: byTemplate[t.id] || [],
    }));
  }

  async getV1(req: Request, id: string) {
    const orgId = this.getOrgId(req);

    const template = await this.templateRepo.findOne({
      where: [
        { id, organizationId: orgId } as any,
        { id, isSystem: true, organizationId: null } as any,
      ],
    });

    if (!template) throw new NotFoundException('Template not found');

    const blocks = await this.dataSource
      .getRepository(TemplateBlock)
      .createQueryBuilder('tb')
      .innerJoin(LegoBlock, 'lb', 'lb.id = tb.blockId')
      .select([
        'tb.templateId as template_id',
        'tb.blockId as block_id',
        'tb.enabled as enabled',
        'tb.displayOrder as display_order',
        'tb.config as config',
        'tb.locked as locked',
        'lb.id as lb_id',
        'lb.key as lb_key',
        'lb.name as lb_name',
        'lb.type as lb_type',
        'lb.category as lb_category',
        'lb.description as lb_description',
        'lb.surface as lb_surface',
        'lb.minRoleToAttach as lb_min_role_to_attach',
        'lb.isActive as lb_is_active',
      ])
      .where('tb.organizationId = :orgId', { orgId })
      .andWhere('tb.templateId = :templateId', { templateId: id })
      .orderBy('tb.displayOrder', 'ASC')
      .getRawMany();

    const mappedBlocks = blocks.map((r) => ({
      blockId: r.block_id,
      enabled: r.enabled,
      displayOrder: r.display_order,
      config: r.config,
      locked: r.locked,
      block: {
        id: r.lb_id,
        key: r.lb_key,
        name: r.lb_name,
        type: r.lb_type,
        category: r.lb_category,
        description: r.lb_description,
        surface: r.lb_surface,
        minRoleToAttach: r.lb_min_role_to_attach,
        isActive: r.lb_is_active,
      },
    }));

    return { ...(template as any), blocks: mappedBlocks };
  }

  async createV1(req: Request, dto: CreateV1Dto) {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);

    if (!dto?.name || dto.name.trim().length === 0) {
      throw new BadRequestException('name is required');
    }

    const isDefaultRequested = dto.isDefault === true;

    return this.dataSource.transaction(async (manager) => {
      if (isDefaultRequested) {
        await manager
          .getRepository(Template)
          .createQueryBuilder()
          .update()
          .set({ isDefault: false })
          .where('organizationId = :orgId', { orgId })
          .execute();
      }

      // Determine templateScope: default to ORG, or use provided value
      const templateScope = dto.templateScope || 'ORG';

      // For WORKSPACE scope, workspaceId should come from x-workspace-id header (handled in controller)
      // For ORG scope, workspaceId must be null
      // For SYSTEM scope, both organizationId and workspaceId must be null (only via admin super path)
      const workspaceId =
        templateScope === 'WORKSPACE' ? dto.workspaceId || null : null;

      // Validate scope rules
      this.validateTemplateScope(
        templateScope,
        templateScope === 'SYSTEM' ? null : orgId,
        workspaceId,
      );

      const entity = manager.getRepository(Template).create({
        name: dto.name.trim(),
        description: dto.description,
        category: dto.category,
        kind: dto.kind || 'project',
        icon: dto.icon,
        isActive: true,
        isSystem: templateScope === 'SYSTEM',
        organizationId: templateScope === 'SYSTEM' ? null : orgId,
        templateScope,
        workspaceId,
        createdById: userId,
        updatedById: userId,
        isDefault: isDefaultRequested,
        lockState: 'UNLOCKED',
        version: 1,
        metadata: dto.metadata ?? null,
        structure: dto.structure ?? null,
        defaultEnabledKPIs: dto.defaultEnabledKPIs ?? [],
      } as any);

      const saved = await manager.getRepository(Template).save(entity);
      return saved;
    });
  }

  /**
   * Update template V1
   * Supports updating: name, description, category, icon, methodology, metadata, structure, defaultEnabledKPIs
   * Does NOT allow changing templateScope or workspaceId
   *
   * @param templateId - Template ID to update
   * @param dto - Update data
   * @param ctx - Tenant context (organizationId, userId, platformRole, workspaceId)
   */
  async updateV1(
    templateId: string,
    dto: {
      name?: string;
      description?: string;
      category?: string;
      icon?: string;
      methodology?: string;
      metadata?: any;
      structure?: Record<string, any>;
      defaultEnabledKPIs?: string[];
    },
    ctx: {
      organizationId: string | null;
      userId: string;
      platformRole?: string;
      workspaceId?: string | null;
    },
  ): Promise<Template> {
    // Wrap in tenant context to ensure repository operations work
    // runWithTenant requires organizationId, so use a placeholder for SYSTEM templates
    const tenantOrgId = ctx.organizationId || 'system-templates';

    return this.tenantContextService.runWithTenant(
      {
        organizationId: tenantOrgId,
        workspaceId: ctx.workspaceId || undefined,
      },
      async () => {
        return this.dataSource.transaction(async (manager) => {
          // Load template by id first
          const template = await manager.getRepository(Template).findOne({
            where: { id: templateId },
          });

          if (!template) {
            throw new NotFoundException('Template not found');
          }

          // Apply scope checks using ctx
          if (template.templateScope === 'ORG') {
            // Require ctx.organizationId equals template.organizationId
            if (
              !ctx.organizationId ||
              ctx.organizationId !== template.organizationId
            ) {
              throw new ForbiddenException(
                'Cannot update template from different organization',
              );
            }
            // Admin role required
            const platformRole = ctx.platformRole
              ? normalizePlatformRole(ctx.platformRole as PlatformRole)
              : null;
            if (!isAdminRole(platformRole)) {
              throw new ForbiddenException(
                'Only organization admins can update ORG templates',
              );
            }
          } else if (template.templateScope === 'WORKSPACE') {
            // Require ctx.organizationId equals template.organizationId
            if (
              !ctx.organizationId ||
              ctx.organizationId !== template.organizationId
            ) {
              throw new ForbiddenException(
                'Cannot update template from different organization',
              );
            }
            // Require ctx.workspaceId equals template.workspaceId
            if (!ctx.workspaceId || ctx.workspaceId !== template.workspaceId) {
              throw new ForbiddenException(
                'Cannot update template from different workspace',
              );
            }
            // Allow admin, or workspace_owner with write access
            // For non-admin, workspace role check is done in controller
          } else if (template.templateScope === 'SYSTEM') {
            // Allow only admin
            const platformRole = ctx.platformRole
              ? normalizePlatformRole(ctx.platformRole as PlatformRole)
              : null;
            if (!isAdminRole(platformRole)) {
              throw new ForbiddenException('Cannot update SYSTEM templates');
            }
          }

          // Update allowed fields only
          if (dto.name !== undefined) {
            template.name = dto.name.trim();
          }
          if (dto.description !== undefined) {
            template.description = dto.description;
          }
          if (dto.category !== undefined) {
            template.category = dto.category;
          }
          if (dto.icon !== undefined) {
            template.icon = dto.icon;
          }
          if (dto.methodology !== undefined) {
            template.methodology = dto.methodology as any;
          }
          if (dto.metadata !== undefined) {
            template.metadata = dto.metadata;
          }
          if (dto.structure !== undefined) {
            template.structure = dto.structure;
          }
          if (dto.defaultEnabledKPIs !== undefined) {
            template.defaultEnabledKPIs = dto.defaultEnabledKPIs;
          }

          template.updatedById = ctx.userId;

          // Persist via repository save
          // Use manager.getRepository which doesn't require tenant context
          const saved = await manager.getRepository(Template).save(template);
          return saved;
        });
      },
    );
  }

  async publishV1(req: Request, templateId: string): Promise<Template> {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);

    return this.dataSource.transaction(async (manager) => {
      // First check template exists and is not archived
      const template = await manager.getRepository(Template).findOne({
        where: [
          { id: templateId, organizationId: orgId },
          { id: templateId, isSystem: true, organizationId: null },
        ],
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }

      if (template.archivedAt) {
        throw new BadRequestException('Cannot publish archived template');
      }

      // Atomic version increment using SQL update
      // Note: TypeORM doesn't support returning() for all databases, so we update then re-read
      await manager
        .getRepository(Template)
        .createQueryBuilder()
        .update(Template)
        .set({
          version: () => 'version + 1',
          publishedAt: () => 'CURRENT_TIMESTAMP',
          updatedById: userId,
        })
        .where('id = :id', { id: templateId })
        .andWhere(
          '(organizationId = :orgId OR (isSystem = true AND organizationId IS NULL))',
          { orgId },
        )
        .execute();

      // Re-read the updated template to return full entity
      const updatedTemplate = await manager
        .getRepository(Template)
        .findOne({ where: { id: templateId } });

      if (!updatedTemplate) {
        throw new NotFoundException('Template not found after update');
      }

      return updatedTemplate;
    });
  }

  async cloneV1(req: Request, templateId: string) {
    const orgId = this.getOrgId(req);
    const userId = this.getUserId(req);

    return this.dataSource.transaction(async (manager) => {
      const t = await manager.getRepository(Template).findOne({
        where: [
          { id: templateId, organizationId: orgId } as any,
          { id: templateId, isSystem: true, organizationId: null } as any,
        ],
      });

      if (!t) throw new NotFoundException('Template not found');
      if (t.archivedAt) throw new BadRequestException('Template is archived');

      const clone = manager.getRepository(Template).create({
        name: `${t.name} (Copy)`,
        description: t.description,
        category: t.category,
        kind: t.kind,
        icon: t.icon,
        isActive: true,
        isSystem: false,
        organizationId: orgId,
        createdById: userId,
        updatedById: userId,
        isDefault: false,
        lockState: 'UNLOCKED',
        version: 1,
        metadata: (t as any).metadata ?? null,
        methodology: (t as any).methodology ?? null,
        structure: (t as any).structure ?? null,
        metrics: (t as any).metrics ?? [],
      } as any);

      const saved = await manager.getRepository(Template).save(clone);

      const existingBlocks = await manager.getRepository(TemplateBlock).find({
        where: { organizationId: orgId, templateId: t.id } as any,
        order: { displayOrder: 'ASC' } as any,
      });

      if (existingBlocks.length > 0) {
        const copies: Partial<TemplateBlock>[] = existingBlocks.map((b) => ({
          organizationId: orgId,
          templateId: (saved as any).id,
          blockId: b.blockId,
          enabled: b.enabled,
          displayOrder: b.displayOrder,
          config: b.config,
          locked: b.locked,
        }));
        await manager
          .getRepository(TemplateBlock)
          .save(copies as TemplateBlock[]);
      }

      return saved;
    });
  }

  async setDefaultV1(req: Request, templateId: string) {
    const orgId = this.getOrgId(req);

    return this.dataSource.transaction(async (manager) => {
      const t = await manager.getRepository(Template).findOne({
        where: { id: templateId, organizationId: orgId } as any,
      });
      if (!t) throw new NotFoundException('Template not found');
      if (t.archivedAt) throw new BadRequestException('Template is archived');
      if (t.isSystem)
        throw new ForbiddenException('System template cannot be org default');

      await manager
        .getRepository(Template)
        .createQueryBuilder()
        .update()
        .set({ isDefault: false })
        .where('organizationId = :orgId', { orgId })
        .execute();

      await manager
        .getRepository(Template)
        .createQueryBuilder()
        .update()
        .set({ isDefault: true })
        .where('id = :id AND organizationId = :orgId', {
          id: templateId,
          orgId,
        })
        .execute();

      return { ok: true };
    });
  }

  async lockV1(req: Request, templateId: string) {
    const orgId = this.getOrgId(req);

    const res = await this.templateRepo.update(
      { id: templateId, organizationId: orgId } as any,
      { lockState: 'LOCKED' } as any,
    );

    if (!res.affected) throw new NotFoundException('Template not found');
    return { ok: true };
  }

  async unlockV1(req: Request, templateId: string) {
    const orgId = this.getOrgId(req);

    const res = await this.templateRepo.update(
      { id: templateId, organizationId: orgId } as any,
      { lockState: 'UNLOCKED' } as any,
    );

    if (!res.affected) throw new NotFoundException('Template not found');
    return { ok: true };
  }

  async archiveV1(req: Request, templateId: string) {
    const orgId = this.getOrgId(req);

    return this.dataSource.transaction(async (manager) => {
      const t = await manager.getRepository(Template).findOne({
        where: { id: templateId, organizationId: orgId } as any,
      });
      if (!t) throw new NotFoundException('Template not found');

      await manager
        .getRepository(Template)
        .createQueryBuilder()
        .update()
        .set({
          archivedAt: new Date(),
          isDefault: false,
        } as any)
        .where('id = :id AND organizationId = :orgId', {
          id: templateId,
          orgId,
        })
        .execute();

      return { ok: true };
    });
  }

  async getByIdForGuard(req: Request, templateId: string) {
    const orgId = this.getOrgId(req);

    const t = await this.templateRepo.findOne({
      select: [
        'id',
        'organizationId',
        'lockState',
        'isSystem',
        'archivedAt',
      ] as any,
      where: [
        { id: templateId, organizationId: orgId } as any,
        { id: templateId, isSystem: true, organizationId: null } as any,
      ],
    });

    if (!t) throw new NotFoundException('Template not found');
    return t;
  }
}
