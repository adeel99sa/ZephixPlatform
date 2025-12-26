import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TemplatesService } from '../services/templates.service';
import { TemplatesInstantiateService } from '../services/templates-instantiate.service';
import { CreateTemplateDto as CreateTemplateLegacyDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ApplyTemplateDto } from '../dto/apply-template.dto';
import { TemplateListQueryDto, CreateTemplateDto } from '../dto/template.dto';
import { TemplateLockGuard } from '../guards/template-lock.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequireOrgRole } from '../../workspaces/guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../../workspaces/guards/require-org-role.guard';

type UserJwt = {
  id: string;
  organizationId: string;
  role?: string;
  email?: string;
};

@Controller('api/templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly instantiateService: TemplatesInstantiateService,
  ) {}

  /**
   * POST /api/templates
   * Create a new template
   * V1: Set createdById from user, lockState defaults to UNLOCKED, isDefault false
   */
  @Post()
  async create(@Body() dto: CreateTemplateDto, @Req() req: Request) {
    return { data: await this.templatesService.createV1(req, dto) };
  }

  /**
   * GET /api/templates
   * List all templates (optionally filtered by scope, category, kind, search, isActive)
   * V1: Add filters for isDefault, isSystem, lockState, includeBlocks
   * Never throws 500 - returns { data: Template[] } with empty array on error
   */
  @Get()
  async list(@Query() q: TemplateListQueryDto, @Req() req: Request) {
    const params = {
      isDefault:
        q.isDefault === 'true'
          ? true
          : q.isDefault === 'false'
            ? false
            : undefined,
      isSystem:
        q.isSystem === 'true'
          ? true
          : q.isSystem === 'false'
            ? false
            : undefined,
      lockState: q.lockState,
      includeBlocks: q.includeBlocks === 'true',
      includeArchived: false,
    };
    return { data: await this.templatesService.listV1(req, params) };
  }

  /**
   * GET /api/templates/:id
   * Get a single template by ID
   * V1: Include full blocks list, ordered, with block config
   * Never throws 500 - returns { data: TemplateDetail | null } with 200
   */
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: Request) {
    return { data: await this.templatesService.getV1(req, id) };
  }

  /**
   * PUT /api/templates/:id
   * Update a template
   * V1: Blocked by TemplateLockGuard if template is locked
   */
  @UseGuards(TemplateLockGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: UserJwt,
  ) {
    return {
      data: await this.templatesService.update(id, user.organizationId, dto),
    };
  }

  /**
   * PATCH /api/templates/:id
   * Update a template (alternative to PUT)
   * V1: Blocked by TemplateLockGuard if template is locked
   * Phase 5: Only org owner/admin can update riskPresets and kpiPresets
   */
  @UseGuards(TemplateLockGuard)
  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: UserJwt,
  ) {
    // Phase 5: Enforce org role check for preset updates
    if (dto.riskPresets !== undefined || dto.kpiPresets !== undefined) {
      const userRole = user.role || 'viewer';
      const isAdmin = userRole === 'admin' || userRole === 'owner';
      if (!isAdmin) {
        throw new ForbiddenException(
          'Only organization owners and admins can update risk and KPI presets',
        );
      }
    }
    return {
      data: await this.templatesService.update(id, user.organizationId, dto),
    };
  }

  /**
   * DELETE /api/templates/:id
   * Delete a template (soft delete via archive)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    await this.templatesService.archive(id, user.organizationId);
  }

  /**
   * POST /api/templates/:id/instantiate
   * Phase 4: Create a project from a template
   * Checks workspace permission: create_projects_in_workspace
   * Returns 400 with clear error codes for validation failures
   */
  @Post(':id/instantiate')
  async instantiate(
    @Param('id') templateId: string,
    @Body()
    dto: {
      workspaceId: string;
      projectName: string;
      startDate?: string;
      endDate?: string;
      ownerId?: string;
    },
    @CurrentUser() user: UserJwt,
    @Req() req: Request,
  ) {
    const requestId = req?.headers?.['x-request-id'] || 'unknown';

    // Validate required fields - return 400 with clear codes
    if (!dto.workspaceId) {
      throw new BadRequestException({
        code: 'MISSING_WORKSPACE_ID',
        message: 'workspaceId is required to create a project from template',
      });
    }

    if (!dto.projectName || !dto.projectName.trim()) {
      throw new BadRequestException({
        code: 'MISSING_PROJECT_NAME',
        message: 'projectName is required and cannot be empty',
      });
    }

    if (!user.organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORGANIZATION_ID',
        message: 'Organization context is required',
      });
    }

    try {
      // Map JWT role to workspace permission role format
      const userRole =
        user.role === 'owner'
          ? 'owner'
          : user.role === 'admin'
            ? 'admin'
            : user.role === 'member' || user.role === 'pm'
              ? 'member'
              : 'viewer';

      const result = await this.instantiateService.instantiate(
        templateId,
        {
          workspaceId: dto.workspaceId,
          name: dto.projectName,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          ownerId: dto.ownerId,
        },
        user.organizationId,
        user.id,
        userRole,
      );

      // Log successful creation
      this.logger.log('Project created from template', {
        templateId,
        projectId: result.id,
        workspaceId: dto.workspaceId,
        organizationId: user.organizationId,
        userId: user.id,
        requestId,
        endpoint: 'POST /api/templates/:id/instantiate',
      });

      // Standardized response contract: { data: { projectId } }
      return {
        data: {
          projectId: result.id,
          name: result.name,
          workspaceId: result.workspaceId,
        },
      };
    } catch (error) {
      // Re-throw validation errors (400, 403, 404) as-is
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log unexpected errors and return 500 with structured error
      this.logger.error('Failed to create project from template', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        templateId,
        workspaceId: dto.workspaceId,
        organizationId: user.organizationId,
        userId: user.id,
        requestId,
        endpoint: 'POST /api/templates/:id/instantiate',
      });

      throw new BadRequestException({
        code: 'TEMPLATE_INSTANTIATION_FAILED',
        message:
          'Failed to create project from template. Please try again or contact support.',
      });
    }
  }
}

/**
 * Admin-only template controller
 * All write operations require org admin role
 */
@Controller('admin/templates')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
export class AdminTemplatesController {
  private readonly logger = new Logger(AdminTemplatesController.name);

  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * GET /admin/templates
   * List active templates for the current organization
   */
  @Get()
  @RequireOrgRole('admin')
  async findAll(@CurrentUser() user: UserJwt) {
    return this.templatesService.findAll(user.organizationId);
  }

  /**
   * GET /admin/templates/:id
   * Fetch a single template by id scoped to organizationId
   */
  @Get(':id')
  @RequireOrgRole('admin')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    return this.templatesService.findOne(id, user.organizationId);
  }

  /**
   * POST /admin/templates
   * Create a new template (admin only)
   */
  @Post()
  @RequireOrgRole('admin')
  async create(
    @Body() dto: CreateTemplateLegacyDto,
    @CurrentUser() user: UserJwt,
  ) {
    return {
      data: await this.templatesService.create(
        dto,
        user.id,
        user.organizationId,
      ),
    };
  }

  /**
   * PATCH /admin/templates/:id
   * Update a template (admin only)
   */
  @Patch(':id')
  @RequireOrgRole('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.templatesService.update(id, user.organizationId, dto);
  }

  /**
   * POST /admin/templates/:id/apply
   * Apply a template to create a new project with phases and tasks
   * Must be before DELETE :id to avoid route conflict
   * Returns 400 with clear error codes for validation failures
   */
  @Post(':id/apply')
  @RequireOrgRole('admin')
  async applyTemplate(
    @Param('id') templateId: string,
    @Body() dto: ApplyTemplateDto,
    @CurrentUser() user: UserJwt,
    @Req() req: Request,
  ) {
    const requestId = req?.headers?.['x-request-id'] || 'unknown';

    // Validate required fields - return 400 with clear codes
    if (!dto.workspaceId) {
      throw new BadRequestException({
        code: 'MISSING_WORKSPACE_ID',
        message: 'workspaceId is required to apply template',
      });
    }

    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException({
        code: 'MISSING_PROJECT_NAME',
        message: 'name is required and cannot be empty',
      });
    }

    if (!user.organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORGANIZATION_ID',
        message: 'Organization context is required',
      });
    }

    try {
      const project = await this.templatesService.applyTemplate(
        templateId,
        {
          name: dto.name,
          workspaceId: dto.workspaceId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          description: dto.description,
        },
        user.organizationId,
        user.id,
      );

      // Log successful creation
      this.logger.log('Project created from template (admin apply)', {
        templateId,
        projectId: project.id,
        workspaceId: dto.workspaceId,
        organizationId: user.organizationId,
        userId: user.id,
        requestId,
        endpoint: 'POST /admin/templates/:id/apply',
      });

      // Return project with id field for backward compatibility
      return {
        id: project.id,
        name: project.name,
        workspaceId: project.workspaceId,
      };
    } catch (error) {
      // Re-throw validation errors (400, 403, 404) as-is
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Log unexpected errors and return 400 with structured error
      this.logger.error('Failed to apply template', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        templateId,
        workspaceId: dto.workspaceId,
        organizationId: user.organizationId,
        userId: user.id,
        requestId,
        endpoint: 'POST /admin/templates/:id/apply',
      });

      throw new BadRequestException({
        code: 'TEMPLATE_APPLY_FAILED',
        message:
          'Failed to apply template. Please try again or contact support.',
      });
    }
  }

  /**
   * DELETE /admin/templates/:id
   * Archive a template (admin only, soft delete via isActive)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireOrgRole('admin')
  async archive(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    await this.templatesService.archive(id, user.organizationId);
  }
}
