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
} from '@nestjs/common';
import { ProjectsService } from './services/projects.service';
import { ProjectAssignmentService } from './services/project-assignment.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetTenant, TenantContext } from '../../common/decorators/tenant.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
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

  @Post()
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Creating project for user ${tenant.userId} in org ${tenant.organizationId}`);
    const user = {
      id: tenant.userId,
      organizationId: tenant.organizationId,
      workspaceId: null,
      role: tenant.userRole,
      organizationRole: tenant.userRole
    };
    return this.projectsService.createProject(
      createProjectDto,
      user,
    );
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

    return this.projectsService.findAllProjects(tenant.organizationId, options);
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
    return this.projectsService.findProjectById(id, tenant.organizationId);
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

  // ===== PHASES ROUTES =====
  @Get(':id/phases')
  async listPhases(
    @Param('id') projectId: string,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Listing phases for project ${projectId}`);
    return {
      success: true,
      data: await this.projectsService.listPhases(projectId, {
        organizationId: tenant.organizationId,
      }),
    };
  }
}

