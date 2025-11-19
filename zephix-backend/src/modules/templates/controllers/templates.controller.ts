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
} from '@nestjs/common';
import { TemplatesService } from '../services/templates.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ApplyTemplateDto } from '../dto/apply-template.dto';
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
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * POST /api/templates
   * Create a new template
   */
  @Post()
  async create(@Body() dto: CreateTemplateDto, @CurrentUser() user: UserJwt) {
    return this.templatesService.create(dto, user.id, user.organizationId);
  }

  /**
   * GET /api/templates
   * List all templates (optionally filtered by scope)
   */
  @Get()
  async findAll(
    @Query('scope') scope?: 'organization' | 'team' | 'personal',
    @CurrentUser() user?: UserJwt,
  ) {
    return this.templatesService.findAll(user?.organizationId || '', scope);
  }

  /**
   * GET /api/templates/:id
   * Get a single template by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    return this.templatesService.findOne(id, user.organizationId);
  }

  /**
   * PUT /api/templates/:id
   * Update a template
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @CurrentUser() user: UserJwt,
  ) {
    return this.templatesService.update(id, user.organizationId, dto);
  }

  /**
   * DELETE /api/templates/:id
   * Delete a template
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: UserJwt) {
    await this.templatesService.delete(id, user.organizationId);
  }
}

/**
 * Admin-only template controller
 * All write operations require org admin role
 */
@Controller('admin/templates')
@UseGuards(JwtAuthGuard, RequireOrgRoleGuard)
export class AdminTemplatesController {
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
  async create(@Body() dto: CreateTemplateDto, @CurrentUser() user: UserJwt) {
    return this.templatesService.create(dto, user.id, user.organizationId);
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
   */
  @Post(':id/apply')
  @RequireOrgRole('admin')
  async applyTemplate(
    @Param('id') templateId: string,
    @Body() dto: ApplyTemplateDto,
    @CurrentUser() user: UserJwt,
  ) {
    try {
      return await this.templatesService.applyTemplate(
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
    } catch (error) {
      // Re-throw to let NestJS handle it
      throw error;
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
