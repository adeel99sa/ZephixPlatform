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
  UsePipes,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
  Req,
  ValidationPipe,
  GoneException,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Template } from '../entities/template.entity';
import { TemplatesService } from '../services/templates.service';
import { TemplatesInstantiateService } from '../services/templates-instantiate.service';
import { TemplatesInstantiateV51Service } from '../services/templates-instantiate-v51.service';
import { TemplatesRecommendationService } from '../services/templates-recommendation.service';
import { TemplatesPreviewV51Service } from '../services/templates-preview-v51.service';
import { InstantiateV51Dto } from '../dto/instantiate-v5-1.dto';
import { RecommendationsQueryDto } from '../dto/recommendations-query.dto';
import { CreateTemplateDto as CreateTemplateLegacyDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/template.dto';
import { UpdateOrgTemplateDto } from '../dto/update-org-template.dto';
import { ApplyTemplateDto } from '../dto/apply-template.dto';
import { TemplateListQueryDto, CreateTemplateDto } from '../dto/template.dto';
import { TemplateLockGuard } from '../guards/template-lock.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequireOrgRole } from '../../workspaces/guards/require-org-role.guard';
import { RequireOrgRoleGuard } from '../../workspaces/guards/require-org-role.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { Headers } from '@nestjs/common';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  PlatformRole,
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';

type UserJwt = {
  id: string;
  organizationId: string;
  role?: string;
  email?: string;
};

@Controller('templates')
@UseGuards(JwtAuthGuard)
@ApiTags('Templates')
@ApiBearerAuth()
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  // UUID validation regex
  private readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  private validateWorkspaceId(workspaceId: string | undefined): string {
    if (!workspaceId) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace header x-workspace-id is required',
      });
    }
    if (!this.UUID_REGEX.test(workspaceId)) {
      throw new ForbiddenException({
        code: 'WORKSPACE_REQUIRED',
        message: 'Workspace header x-workspace-id must be a valid UUID',
      });
    }
    return workspaceId;
  }

  private validateWorkspaceIdOptional(
    workspaceId: string | undefined,
  ): string | null {
    if (!workspaceId) {
      return null;
    }
    if (!this.UUID_REGEX.test(workspaceId)) {
      throw new BadRequestException({
        code: 'INVALID_WORKSPACE_ID',
        message: 'Workspace header x-workspace-id must be a valid UUID',
      });
    }
    return workspaceId;
  }

  constructor(
    private readonly templatesService: TemplatesService,
    private readonly instantiateService: TemplatesInstantiateService,
    private readonly instantiateV51Service: TemplatesInstantiateV51Service,
    private readonly recommendationService: TemplatesRecommendationService,
    private readonly previewV51Service: TemplatesPreviewV51Service,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * POST /api/templates
   * Create a new template
   * PART 2 Step 7: Admin can create ORG and WORKSPACE templates
   * Workspace Owners can create WORKSPACE templates only
   * V1: Set createdById from user, lockState defaults to UNLOCKED, isDefault false
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateTemplateDto, @Req() req: AuthRequest) {
    const auth = getAuthContext(req);
    const userId = auth.userId;
    const orgId = auth.organizationId;

    // Get canonical org role using normalizePlatformRole
    const platformRole = normalizePlatformRole(auth.platformRole);
    const isOrgAdmin = isAdminRole(platformRole);

    // Determine templateScope from DTO or default to ORG
    const templateScope = dto.templateScope || 'ORG';

    // Force templateScope into DTO to prevent service layer ambiguity
    dto.templateScope = templateScope;

    // Role enforcement:
    // - Admin can create ORG and WORKSPACE templates
    // - Workspace Owner can create WORKSPACE templates only (for their workspace)
    // - Member and Guest cannot create templates
    if (templateScope === 'ORG') {
      // Only Admin can create ORG templates
      if (!isOrgAdmin) {
        throw new ForbiddenException(
          'Only organization admins can create ORG templates',
        );
      }

      // ORG templates must not have workspaceId
      dto.workspaceId = null;
    } else if (templateScope === 'WORKSPACE') {
      // Admin or Workspace Owner can create WORKSPACE templates
      // Validate workspaceId header ONLY for WORKSPACE scope
      const workspaceId = this.validateWorkspaceId(
        req.headers['x-workspace-id'] as string | undefined,
      );

      if (!workspaceId) {
        throw new ForbiddenException(
          'x-workspace-id header is required for WORKSPACE templates',
        );
      }

      // Check if user is Admin (can create in any workspace) or Workspace Owner
      if (!isOrgAdmin) {
        // Check workspace role
        const workspaceRole = await this.workspaceRoleGuard.getWorkspaceRole(
          workspaceId,
          userId,
        );
        if (workspaceRole !== 'workspace_owner') {
          throw new ForbiddenException(
            'Only workspace owners can create WORKSPACE templates',
          );
        }
      }

      // Override workspaceId from header (security: don't trust body)
      dto.workspaceId = workspaceId;
    } else if (templateScope === 'SYSTEM') {
      // SYSTEM templates can only be created via admin super path (not via normal API)
      throw new ForbiddenException(
        'SYSTEM templates cannot be created via API',
      );
    }

    return this.responseService.success(
      await this.templatesService.createV1(req as any, dto),
    );
  }

  /**
   * GET /api/templates
   * List all templates (optionally filtered by scope, category, kind, search, isActive)
   * V1: Add filters for isDefault, isSystem, lockState, includeBlocks
   * Never throws 500 - returns { data: Template[] } with empty array on error
   */
  @Get()
  async list(@Query() q: TemplateListQueryDto, @Req() req: Request) {
    // Validate x-workspace-id header if present
    const workspaceIdHeader = req.headers['x-workspace-id'] as
      | string
      | undefined;
    const workspaceId = workspaceIdHeader
      ? this.validateWorkspaceIdOptional(workspaceIdHeader)
      : null;

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

    return this.responseService.success(
      await this.templatesService.listV1(req, params, workspaceId),
    );
  }

  /**
   * Wave 6: GET /api/templates/published
   * List only published templates (system + org).
   * Used by project create modal for non-admin users.
   */
  @Get('published')
  async listPublished(@Req() req: Request) {
    const auth = getAuthContext(req as any);
    return this.responseService.success(
      await this.templatesService.findPublishedWithPreview(auth.organizationId),
    );
  }

  /**
   * Sprint 4: GET /api/templates/recommendations
   * Get template recommendations with deterministic scoring
   * Route order: Must be before :id catch-all to avoid shadowing
   */
  @Get('recommendations')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        // Build standardized validation error
        const firstError = errors[0];
        const firstMessage = firstError?.constraints
          ? Object.values(firstError.constraints)[0]
          : 'Invalid request';

        // Extract property name if available
        const property = firstError?.property || 'unknown';
        const message = `Query parameter '${property}' is not allowed`;

        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message,
          errors, // Keep for detailed extraction in filter
        });
      },
    }),
  )
  @ApiOperation({
    summary: 'Get template recommendations',
    description:
      'Returns top 3 recommended templates and up to 12 others based on deterministic scoring',
  })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations returned successfully',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            recommended: { type: 'array' },
            others: { type: 'array' },
            inputsEcho: { type: 'object' },
            generatedAt: { type: 'string' },
          },
        },
      },
    },
  })
  async getRecommendations(
    @Query() queryDto: RecommendationsQueryDto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
  ) {
    const workspaceId = this.validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Additional check for forbidden params (ValidationPipe should catch these, but extra safety)
    const forbiddenParams = ['userId', 'popularity', 'rankScore', 'usageCount'];
    const queryParams = req.query as Record<string, any>;
    for (const param of forbiddenParams) {
      if (param in queryParams) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `Query parameter '${param}' is not allowed`,
        });
      }
    }

    const query = {
      containerType: queryDto.containerType,
      workType: queryDto.workType,
      durationDays: queryDto.durationDays,
      complexity: queryDto.complexity,
    };

    const result = await this.recommendationService.getRecommendations(
      query,
      auth.organizationId,
      workspaceId,
    );

    return this.responseService.success(result);
  }

  /**
   * Sprint 4: GET /api/templates/:templateId/preview-v5_1
   * Get template preview for v5_1
   * Note: Different path segment count than :id catch-all, no shadowing risk
   */
  @Get(':templateId/preview-v5_1')
  @ApiOperation({
    summary: 'Get template preview for v5.1',
    description:
      'Returns template structure, phases, task counts, and lock policy',
  })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Preview returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - template not found',
    schema: {
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  })
  async getPreviewV51(
    @Param('templateId') templateId: string,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
  ) {
    const workspaceId = this.validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require read access
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const result = await this.previewV51Service.getPreview(
      templateId,
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );

    return this.responseService.success(result);
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
  @UseGuards(JwtAuthGuard, TemplateLockGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    // Load template directly using dataSource to avoid req dependency in getV1
    const template = await this.dataSource.getRepository(Template).findOne({
      where: [
        { id, organizationId: auth.organizationId },
        { id, templateScope: 'SYSTEM', organizationId: null },
      ],
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Role enforcement: same as create
    const platformRole = normalizePlatformRole(auth.platformRole);
    if (template.templateScope === 'ORG' && !isAdminRole(platformRole)) {
      throw new ForbiddenException(
        'Only organization admins can update ORG templates',
      );
    }
    if (template.templateScope === 'WORKSPACE') {
      // Validate workspace header is present for WORKSPACE templates
      const workspaceId = this.validateWorkspaceId(
        req.headers['x-workspace-id'] as string | undefined,
      );
      if (!workspaceId || workspaceId !== template.workspaceId) {
        throw new BadRequestException(
          'x-workspace-id header is required and must match template workspaceId for WORKSPACE templates',
        );
      }
      if (!isAdminRole(platformRole)) {
        const workspaceRole = await this.workspaceRoleGuard.getWorkspaceRole(
          template.workspaceId,
          auth.userId,
        );
        if (workspaceRole !== 'workspace_owner') {
          throw new ForbiddenException(
            'Only workspace owners can update WORKSPACE templates',
          );
        }
      }
      if (!isAdminRole(platformRole)) {
        const workspaceRole = await this.workspaceRoleGuard.getWorkspaceRole(
          template.workspaceId,
          auth.userId,
        );
        if (workspaceRole !== 'workspace_owner') {
          throw new ForbiddenException(
            'Only workspace owners can update WORKSPACE templates',
          );
        }
      }
    }
    if (template.templateScope === 'SYSTEM') {
      throw new ForbiddenException('Cannot update SYSTEM templates');
    }

    // Build context for updateV1
    const ctx = {
      organizationId: auth.organizationId,
      userId: auth.userId,
      platformRole: auth.platformRole,
      workspaceId:
        template.templateScope === 'WORKSPACE'
          ? this.validateWorkspaceId(
              req.headers['x-workspace-id'] as string | undefined,
            )
          : null,
    };

    return this.responseService.success(
      await this.templatesService.updateV1(id, dto, ctx),
    );
  }

  /**
   * PATCH /api/templates/:id
   * Update a template (alternative to PUT)
   * V1: Blocked by TemplateLockGuard if template is locked
   * Phase 5: Only org owner/admin can update riskPresets and kpiPresets
   */
  @UseGuards(JwtAuthGuard, TemplateLockGuard)
  @Patch(':id')
  async patch(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: AuthRequest,
  ) {
    const auth = getAuthContext(req);
    // Load template directly using dataSource to avoid req dependency in getV1
    const template = await this.dataSource.getRepository(Template).findOne({
      where: [
        { id, organizationId: auth.organizationId },
        { id, templateScope: 'SYSTEM', organizationId: null },
      ],
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Role enforcement: same as create
    const platformRole = normalizePlatformRole(auth.platformRole);
    if (template.templateScope === 'ORG' && !isAdminRole(platformRole)) {
      throw new ForbiddenException(
        'Only organization admins can update ORG templates',
      );
    }
    if (template.templateScope === 'WORKSPACE') {
      // Validate workspace header is present for WORKSPACE templates
      const workspaceId = this.validateWorkspaceId(
        req.headers['x-workspace-id'] as string | undefined,
      );
      if (!workspaceId || workspaceId !== template.workspaceId) {
        throw new BadRequestException(
          'x-workspace-id header is required and must match template workspaceId for WORKSPACE templates',
        );
      }
      if (!isAdminRole(platformRole)) {
        const workspaceRole = await this.workspaceRoleGuard.getWorkspaceRole(
          template.workspaceId,
          auth.userId,
        );
        if (workspaceRole !== 'workspace_owner') {
          throw new ForbiddenException(
            'Only workspace owners can update WORKSPACE templates',
          );
        }
      }
    }
    if (template.templateScope === 'SYSTEM') {
      throw new ForbiddenException('Cannot update SYSTEM templates');
    }

    // Build context for updateV1
    const ctx = {
      organizationId: auth.organizationId,
      userId: auth.userId,
      platformRole: auth.platformRole,
      workspaceId:
        template.templateScope === 'WORKSPACE'
          ? this.validateWorkspaceId(
              req.headers['x-workspace-id'] as string | undefined,
            )
          : null,
    };

    return this.responseService.success(
      await this.templatesService.updateV1(id, dto, ctx),
    );
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
   * POST /api/templates/:id/publish
   * Publish a template - increments version and sets publishedAt
   * Admin only for ORG templates
   * Workspace Owner plus Admin for WORKSPACE templates
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
  @RequireOrgRole('admin') // TODO: Add workspace owner check for WORKSPACE templates
  async publish(@Param('id') id: string, @Req() req: Request) {
    return this.responseService.success(
      await this.templatesService.publishV1(req, id),
    );
  }

  /**
   * Sprint 2.5: POST /api/templates/:templateId/instantiate-v5_1
   * Phase 5.1 compliant template instantiation - creates WorkPhase and WorkTask
   * Route order: Must be before legacy instantiate route to avoid shadowing
   */
  @Post(':templateId/instantiate-v5_1')
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID (required)',
    required: true,
  })
  @ApiOperation({
    summary: 'Instantiate template v5.1 (creates WorkPhase and WorkTask)',
    description:
      'Phase 5.1 compliant template instantiation. Creates WorkPhase and WorkTask entities instead of legacy Task entities.',
  })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiBody({ type: InstantiateV51Dto })
  @ApiResponse({
    status: 201,
    description: 'Template instantiated successfully',
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            projectId: { type: 'string', format: 'uuid' },
            projectName: { type: 'string' },
            state: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'COMPLETED'] },
            structureLocked: { type: 'boolean' },
            phaseCount: { type: 'number' },
            taskCount: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - template or project not found',
    schema: {
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - project locked or invalid state',
    schema: {
      properties: { code: { type: 'string' }, message: { type: 'string' } },
    },
  })
  async instantiateV51(
    @Param('templateId') templateId: string,
    @Body() dto: InstantiateV51Dto,
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
  ) {
    const workspaceId = this.validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const result = await this.instantiateV51Service.instantiateV51(
      templateId,
      dto,
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );

    return this.responseService.success(result);
  }

  /**
   * POST /api/templates/:id/instantiate
   * LEGACY ROUTE - DEPRECATED
   * This route is no longer supported. Use /api/templates/:id/instantiate-v5_1 instead
   */
  @Post(':id/instantiate')
  @HttpCode(HttpStatus.GONE)
  async instantiate(
    @Param('id') _templateId: string,
    @Body() _dto: any,
    @CurrentUser() _user: UserJwt,
    @Req() _req: Request,
  ) {
    throw new GoneException({
      code: 'LEGACY_ROUTE',
      message:
        'This route is deprecated. Use POST /api/templates/:id/instantiate-v5_1 instead',
    });
  }

  // Legacy instantiate implementation removed - route returns 410 Gone
  // Original code preserved below for reference but never executed
  /*
  private async instantiateLegacy(
    templateId: string,
    dto: {
      workspaceId: string;
      projectName: string;
      startDate?: string;
      endDate?: string;
      ownerId?: string;
    },
    user: UserJwt,
    req: Request,
  ) {
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
  */
}

/**
 * Admin-only template controller
 * All write operations require org admin role
 */
@Controller('admin/templates')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
export class AdminTemplatesController {
  private readonly logger = new Logger(AdminTemplatesController.name);

  constructor(
    private readonly templatesService: TemplatesService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * GET /admin/templates
   * List active templates for the current organization.
   * Wave 6: Uses unified `templates` table with enriched preview.
   */
  @Get()
  @RequireOrgRole('admin')
  async findAll(@CurrentUser() user: UserJwt) {
    return this.templatesService.findAllUnified(user.organizationId);
  }

  /**
   * GET /admin/templates/:id
   * Fetch a single template by id scoped to organizationId.
   * Wave 6: Uses unified `templates` table.
   */
  @Get(':id')
  @RequireOrgRole('admin')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    return this.templatesService.findOneUnified(id, user.organizationId);
  }

  /**
   * POST /admin/templates
   * Create a new org template (admin only).
   * Wave 6: Creates in `templates` table.
   */
  @Post()
  @RequireOrgRole('admin')
  async create(
    @Body() dto: CreateTemplateLegacyDto,
    @CurrentUser() user: UserJwt,
  ) {
    return {
      data: await this.templatesService.createUnified(
        dto,
        user.id,
        user.organizationId,
      ),
    };
  }

  /**
   * POST /admin/templates/:id/clone
   * Clone a system template into an org-owned template.
   */
  @Post(':id/clone')
  @RequireOrgRole('admin')
  async clone(@Param('id') templateId: string, @CurrentUser() user: UserJwt) {
    return this.templatesService.cloneSystemTemplateToOrg(
      templateId,
      user.organizationId,
      user.id,
    );
  }

  /**
   * POST /admin/templates/:id/publish
   * Publish an org template so PMs can use it.
   */
  @Post(':id/publish')
  @RequireOrgRole('admin')
  async publish(@Param('id') templateId: string, @CurrentUser() user: UserJwt) {
    return this.templatesService.publishTemplate(
      templateId,
      user.organizationId,
    );
  }

  /**
   * POST /admin/templates/:id/unpublish
   * Unpublish an org template.
   */
  @Post(':id/unpublish')
  @RequireOrgRole('admin')
  async unpublish(
    @Param('id') templateId: string,
    @CurrentUser() user: UserJwt,
  ) {
    return this.templatesService.unpublishTemplate(
      templateId,
      user.organizationId,
    );
  }

  /**
   * PATCH /admin/templates/:id
   * Update an org template (admin only).
   * Wave 6: Uses updateOrgTemplate on `templates` table.
   */
  @Patch(':id')
  @RequireOrgRole('admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrgTemplateDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.templatesService.updateOrgTemplate(
      id,
      user.organizationId,
      dto,
    );
  }

  /**
   * POST /admin/templates/:id/apply
   * Apply a template to create a new project.
   * Wave 6: Uses `templates` table for correct KPI FK chain.
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
      const project = await this.templatesService.applyTemplateUnified(
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

      this.logger.log('Project created from template (admin apply)', {
        templateId,
        projectId: project.id,
        workspaceId: dto.workspaceId,
        organizationId: user.organizationId,
        userId: user.id,
        requestId,
        endpoint: 'POST /admin/templates/:id/apply',
      });

      return {
        id: project.id,
        name: project.name,
        workspaceId: project.workspaceId,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

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
   * Archive a template (admin only, soft delete via isActive).
   * Wave 6: Uses `templates` table.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireOrgRole('admin')
  async archive(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    await this.templatesService.archiveUnified(id, user.organizationId);
  }
}
