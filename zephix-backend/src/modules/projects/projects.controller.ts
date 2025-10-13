console.log('🔍 ProjectsController file loading...');

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './services/projects.service';
import { ProjectAssignmentService } from './services/project-assignment.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { CreateProjectFromTemplateDto } from './dto/create-project-from-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { JwtAuthVerboseGuard } from '../auth/guards/jwt-auth-verbose.guard';
import { OrganizationContextGuard } from '../../guards/organization-context.guard';
import { OrganizationValidationGuard } from '../../guards/organization-validation.guard';
import { GetTenant, TenantContext } from '../../common/decorators/tenant.decorator';
import { ApiResponse } from '../../shared/utils/response.utils';
import { QueryFailedError } from 'typeorm';

@Controller('projects')
@UseGuards(JwtAuthGuard, OrganizationContextGuard, OrganizationValidationGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly assignmentService: ProjectAssignmentService,
  ) {
    console.log('🚀 ProjectsController constructor called!');
  }

  @Get('test')
  async test() {
    return { message: "Projects controller is working", timestamp: new Date() };
  }

  @Post('test-db-error')
  @HttpCode(HttpStatus.BAD_REQUEST)
  async testDbError(@GetTenant() tenant: TenantContext) {
    this.logger.log(`Testing DB error for org ${tenant.organizationId}`);
    
    // This will intentionally cause a foreign key violation if the workspaceId doesn't exist
    // Or a unique constraint if a project with this name already exists in a non-existent workspace
    throw new QueryFailedError(
      'INSERT INTO projects (name, workspace_id, organization_id) VALUES ($1, $2, $3)',
      ['Test Project for DB Error', 'non-existent-workspace-id', tenant.organizationId],
      new Error('Foreign key violation: workspace_id does not exist')
    );
  }

  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @GetTenant() tenant: TenantContext,
    @Req() req: any,
  ) {
    const requestId = req.headers['x-request-id'] || 'unknown';
    this.logger.log(`[${requestId}] Creating project for user ${tenant.userId} in org ${tenant.organizationId}`);
    
    try {
      // Server-side defaults: use user's workspace if not provided
      if (!createProjectDto.workspaceId) {
        const user = req.user;
        createProjectDto.workspaceId = user.workspaceId;
        this.logger.log(`[${requestId}] Set workspaceId to user's workspace: ${createProjectDto.workspaceId}`);
        
        if (!createProjectDto.workspaceId) {
          throw new BadRequestException('No workspace found for current user');
        }
      }
      
      const project = await this.projectsService.createProjectLegacy(
        createProjectDto,
        tenant.organizationId,
        tenant.userId,
      );
      
      this.logger.log(`[${requestId}] Project created successfully: ${project.id}`);
      return ApiResponse.success(ApiResponse.serializeProject(project));
    } catch (error) {
      this.logger.error(`[${requestId}] Project creation failed:`, error);
      throw error;
    }
  }

  @Post('from-template')
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @Body() createProjectFromTemplateDto: CreateProjectFromTemplateDto,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Creating project from template for user ${tenant.userId} in org ${tenant.organizationId}`);
    
    try {
      const project = await this.projectsService.createFromTemplate(
        createProjectFromTemplateDto,
        tenant.userId
      );

      return ApiResponse.success(
        ApiResponse.serializeProject(project),
        'Project created from template successfully',
      );
    } catch (error) {
      this.logger.error(`❌ Failed to create project from template: ${error.message}`, error.stack);
      this.logger.error(`❌ Error details:`, error);
      throw error; // NestJS exception filter handles this
    }
  }

  @Get()
  async findAll(
    @GetTenant() tenant: TenantContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    this.logger.log(`Fetching projects for org ${tenant.organizationId}`);
    
    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      search,
    };

    const result = await this.projectsService.findAllProjects(tenant.organizationId, options);
    return ApiResponse.success(
      result.projects.map(p => ApiResponse.serializeProject(p))
    );
  }

  @Get('stats')
  async getStats(@GetTenant() tenant: TenantContext) {
    this.logger.log(`Fetching project stats for org ${tenant.organizationId}`);
    return this.projectsService.getOrganizationStats(tenant.organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Fetching project ${id} for org ${tenant.organizationId}`);
    const project = await this.projectsService.findProjectById(id, tenant.organizationId);
    return ApiResponse.success(ApiResponse.serializeProject(project));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Updating project ${id} for org ${tenant.organizationId}`);
    return this.projectsService.updateProject(
      id,
      updateProjectDto,
      tenant.organizationId,
      tenant.userId,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Deleting project ${id} for org ${tenant.organizationId}`);
    return this.projectsService.deleteProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
  }

  @Post(':id/assign')
  async assignUser(
    @Param('id') projectId: string,
    @Body() dto: AssignUserDto,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Assigning user ${dto.userId} to project ${projectId}`);
    return this.assignmentService.assignUser(projectId, dto, {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    });
  }

  @Get(':id/assignments')
  async getAssignments(
    @Param('id') projectId: string,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Fetching assignments for project ${projectId}`);
    return this.assignmentService.getProjectAssignments(projectId, {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    });
  }

  @Delete(':id/assign/:userId')
  async removeUser(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Removing user ${userId} from project ${projectId}`);
    return this.assignmentService.removeUser(projectId, userId, {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    });
  }

  @Patch(':id/assign/:userId/role')
  async updateUserRole(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() dto: { role: string },
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Updating role for user ${userId} in project ${projectId} to ${dto.role}`);
    return this.assignmentService.updateUserRole(projectId, userId, dto.role, {
      userId: tenant.userId,
      organizationId: tenant.organizationId,
    });
  }

  @Post('bulk-restore')
  async bulkRestore(
    @Body() dto: { ids: string[] },
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Bulk restoring ${dto.ids.length} projects for org ${tenant.organizationId}`);
    
    const results = [];
    for (const id of dto.ids) {
      try {
        const result = await this.projectsService.restoreProject(id, tenant.organizationId, tenant.userId);
        results.push({ id, success: true, data: result });
      } catch (error) {
        this.logger.error(`Failed to restore project ${id}: ${error.message}`);
        results.push({ id, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    return { 
      success: true, 
      message: `Restored ${successCount}/${dto.ids.length} projects`,
      results 
    };
  }
}