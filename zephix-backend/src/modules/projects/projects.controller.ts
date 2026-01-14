if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV !== 'test') {
  console.log('🔍 ProjectsController file loading...');
}
}

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
  BadRequestException,
  Req,
  NotFoundException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { ProjectsService } from './services/projects.service';
// import { ProjectAssignmentService } from './services/project-assignment.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GetTenant,
  TenantContext,
} from '../../common/decorators/tenant.decorator';
import { RequireWorkspaceRole } from '../workspaces/decorators/require-workspace-role.decorator';
import { RequireProjectWorkspaceRoleGuard } from './guards/require-project-workspace-role.guard';
import { RequireWorkspacePermission } from '../workspaces/decorators/require-workspace-permission.decorator';
import { RequireWorkspacePermissionGuard } from '../workspaces/guards/require-workspace-permission.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    // private readonly assignmentService: ProjectAssignmentService,
  ) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('🚀 ProjectsController constructor called!');
    }
  }

  @Get('test')
  async test() {
    return { message: 'Projects controller is working', timestamp: new Date() };
  }

  @Post()
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @GetTenant() tenant: TenantContext,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Input validation with explicit error codes
    if (!createProjectDto.workspaceId) {
      throw new BadRequestException({
        code: 'MISSING_WORKSPACE_ID',
        message: 'Workspace ID is required',
      });
    }

    if (!createProjectDto.name || createProjectDto.name.trim().length === 0) {
      throw new BadRequestException({
        code: 'MISSING_PROJECT_NAME',
        message: 'Project name is required',
      });
    }

    if (!tenant.organizationId) {
      throw new BadRequestException({
        code: 'MISSING_ORGANIZATION_ID',
        message: 'Organization context is missing',
      });
    }

    try {
      this.logger.log(
        `Creating project for user ${tenant.userId} in org ${tenant.organizationId}`,
      );

      const project = await this.projectsService.createWithTemplateSnapshotV1(
        req,
        {
          name: createProjectDto.name,
          description: createProjectDto.description,
          status: createProjectDto.status,
          workspaceId: createProjectDto.workspaceId,
          templateId: createProjectDto.templateId,
        },
      );

      // Structured logging
      this.logger.log('Project created', {
        event: 'project.created',
        organizationId: tenant.organizationId,
        workspaceId: createProjectDto.workspaceId,
        projectId: project.id,
        creatorUserId: tenant.userId,
        projectName: project.name,
        requestId,
        endpoint: 'POST /api/projects',
      });

      return { data: project };
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Log and throw generic error
      this.logger.error('Failed to create project', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        workspaceId: createProjectDto.workspaceId,
        requestId,
        endpoint: 'POST /api/projects',
      });
      throw new BadRequestException({
        code: 'PROJECT_CREATION_FAILED',
        message: 'Failed to create project',
      });
    }
  }

  @Get()
  async findAll(
    @GetTenant() tenant: TenantContext,
    @Query('workspaceId') workspaceId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Req() req?: Request,
  ) {
    try {
      this.logger.log(`Fetching projects for org ${tenant.organizationId}`);

      const options = {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        status,
        search,
        workspaceId,
        userId: tenant.userId,
        userRole: tenant.userRole,
      };

      const result = await this.projectsService.findAllProjects(
        tenant.organizationId,
        options,
      );
      // Standardized response contract: { data: { projects, total, page, totalPages } }
      return { data: result };
    } catch (error) {
      // Never throw 500 - return safe defaults
      const requestId = req?.headers['x-request-id'] || 'unknown';
      this.logger.error('Failed to get projects', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        requestId,
        endpoint: 'GET /api/projects',
      });
      // Return safe defaults
      return {
        data: {
          projects: [],
          total: 0,
          page: 1,
          totalPages: 0,
        },
      };
    }
  }

  @Get('stats')
  async getStats(@GetTenant() tenant: TenantContext, @Req() req?: Request) {
    try {
      this.logger.log(
        `Fetching project stats for org ${tenant.organizationId}`,
      );
      const stats = await this.projectsService.getOrganizationStats(
        tenant.organizationId,
      );
      // Standardized response contract: { data: Stats }
      return { data: stats };
    } catch (error) {
      // Never throw 500 - return safe defaults
      const requestId = req?.headers['x-request-id'] || 'unknown';
      this.logger.error('Failed to get project stats', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        requestId,
        endpoint: 'GET /api/projects/stats',
      });
      // Return safe defaults (zeroed stats)
      return {
        data: {
          total: 0,
          active: 0,
          archived: 0,
          byStatus: {},
        },
      };
    }
  }

  @Get('stats/by-workspace/:workspaceId')
  async countByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @GetTenant() tenant: TenantContext,
  ) {
    if (!workspaceId) {
      throw new BadRequestException('workspaceId required');
    }
    this.logger.log(
      `Counting projects for org ${tenant.organizationId}, workspace ${workspaceId}`,
    );
    const count = await this.projectsService.countByWorkspace(
      tenant.organizationId,
      workspaceId,
    );
    return { data: { count } };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetTenant() tenant: TenantContext,
    @Req() req?: Request,
  ) {
    try {
      this.logger.log(
        `Fetching project ${id} for org ${tenant.organizationId}`,
      );
      const project = await this.projectsService.findProjectById(
        id,
        tenant.organizationId,
        tenant.userId,
        tenant.userRole,
      );
      // Standardized response contract: { data: Project | null }
      return { data: project || null };
    } catch (error) {
      // Never throw 500 - return null for not found
      const requestId = req?.headers['x-request-id'] || 'unknown';
      this.logger.error('Failed to get project', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        projectId: id,
        requestId,
        endpoint: 'GET /api/projects/:id',
      });
      // Return null for not found (200 status)
      return { data: null };
    }
  }

  @Patch(':id')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @GetTenant() tenant: TenantContext,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Input validation
    if (!id) {
      throw new BadRequestException({
        code: 'MISSING_PROJECT_ID',
        message: 'Project ID is required',
      });
    }

    try {
      // Verify project exists
      const existingProject = await this.projectsService.findProjectById(
        id,
        tenant.organizationId,
        tenant.userId,
        tenant.userRole,
      );
      if (!existingProject) {
        throw new BadRequestException({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      this.logger.log(
        `Updating project ${id} for org ${tenant.organizationId}`,
      );
      const updated = await this.projectsService.updateProject(
        id,
        updateProjectDto,
        tenant.organizationId,
        tenant.userId,
      );
      return { data: updated };
    } catch (error) {
      // Re-throw validation errors
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Log and throw generic error
      this.logger.error('Failed to update project', {
        error: error instanceof Error ? error.message : String(error),
        errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        projectId: id,
        requestId,
        endpoint: 'PATCH /api/projects/:id',
      });
      throw new BadRequestException({
        code: 'PROJECT_UPDATE_FAILED',
        message: 'Failed to update project',
      });
    }
  }

  /**
   * Phase 7: Update project settings
   * Note: Permission check is done in service via workspace permission service
   */
  @Patch(':id/settings')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: UpdateProjectDto,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(
      `Updating project settings ${id} for org ${tenant.organizationId}`,
    );
    return this.projectsService.updateProjectSettings(
      id,
      settings,
      tenant.organizationId,
      tenant.userId,
    );
  }

  /**
   * Phase 7: Archive project
   * Note: Permission check is done in service via workspace permission service
   */
  @Post(':id/archive')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async archive(@Param('id') id: string, @GetTenant() tenant: TenantContext) {
    this.logger.log(`Archiving project ${id} for org ${tenant.organizationId}`);
    return this.projectsService.archiveProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
  }

  @Delete(':id')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async remove(@Param('id') id: string, @GetTenant() tenant: TenantContext) {
    this.logger.log(`Deleting project ${id} for org ${tenant.organizationId}`);
    return this.projectsService.deleteProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
  }

  // @Post(':id/assign')
  // async assignUser(
  //   @Param('id') projectId: string,
  //   @Body() dto: AssignUserDto,
  //   @GetTenant() tenant: TenantContext,
  // ) {
  //   this.logger.log(`Assigning user ${dto.userId} to project ${projectId}`);
  //   return this.assignmentService.assignUser(projectId, dto, {
  //     userId: tenant.userId,
  //     organizationId: tenant.organizationId,
  //   });
  // }

  // @Get(':id/assignments')
  // async getAssignments(
  //   @Param('id') projectId: string,
  //   @GetTenant() tenant: TenantContext,
  // ) {
  //   this.logger.log(`Fetching assignments for project ${projectId}`);
  //   return this.assignmentService.getProjectAssignments(projectId, {
  //     userId: tenant.userId,
  //     organizationId: tenant.organizationId,
  //   });
  // }

  // @Delete(':id/assign/:userId')
  // async removeUser(
  //   @Param('id') projectId: string,
  //   @Param('userId') userId: string,
  //   @GetTenant() tenant: TenantContext,
  // ) {
  //   this.logger.log(`Removing user ${userId} from project ${projectId}`);
  //   return this.assignmentService.removeUser(projectId, userId, {
  //     userId: tenant.userId,
  //     organizationId: tenant.organizationId,
  //   });
  // }

  // @Patch(':id/assign/:userId/role')
  // async updateUserRole(
  //   @Param('id') projectId: string,
  //   @Param('userId') userId: string,
  //   @Body() dto: { role: string },
  //   @GetTenant() tenant: TenantContext,
  // ) {
  //   this.logger.log(`Updating role for user ${userId} in project ${projectId} to ${dto.role}`);
  //   return this.assignmentService.updateUserRole(projectId, userId, dto.role, {
  //     userId: tenant.userId,
  //     organizationId: tenant.organizationId,
  //   });
  // }

}
