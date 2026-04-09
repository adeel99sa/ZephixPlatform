import { bootLog } from '../../common/utils/debug-boot';
bootLog('ProjectsController file loading');

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
import { TemplatesInstantiateV51Service } from '../templates/services/templates-instantiate-v51.service';
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
import { formatResponse } from '../../shared/helpers/response.helper';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly templatesInstantiateV51Service: TemplatesInstantiateV51Service,
    // private readonly assignmentService: ProjectAssignmentService,
  ) {
    bootLog('ProjectsController constructor called');
  }

  @Post()
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_owner', { allowAdminOverride: true })
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
   * Phase 3 (Template Center): Get project team member IDs.
   * Anyone with read access to the project workspace can view the team.
   */
  @Get(':id/team')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_viewer', { allowAdminOverride: true })
  async getTeam(@Param('id') id: string, @GetTenant() tenant: TenantContext) {
    const result = await this.projectsService.getProjectTeam(id, tenant.organizationId);
    return formatResponse(result);
  }

  /**
   * Phase 3 (Template Center): Update project team.
   * Only workspace members (member+) or admin can mutate team.
   */
  @Patch(':id/team')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async updateTeam(
    @Param('id') id: string,
    @Body() body: { teamMemberIds: string[] },
    @GetTenant() tenant: TenantContext,
  ) {
    if (!Array.isArray(body?.teamMemberIds)) {
      throw new BadRequestException('teamMemberIds must be an array');
    }
    const result = await this.projectsService.updateProjectTeam(
      id,
      tenant.organizationId,
      body.teamMemberIds,
    );
    return formatResponse(result);
  }

  /**
   * Phase 4 (Template Center): Save this project as a WORKSPACE-scoped template.
   * Only Workspace Owner (or Org Admin) can mint templates from a project.
   */
  @Post(':id/save-as-template')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_owner', { allowAdminOverride: true })
  async saveAsTemplate(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
    @GetTenant() tenant: TenantContext,
  ) {
    const template = await this.projectsService.saveProjectAsTemplate(
      id,
      tenant.organizationId,
      tenant.userId,
      { name: body?.name, description: body?.description },
    );
    return formatResponse({
      id: template.id,
      name: template.name,
      templateScope: (template as any).templateScope,
      workspaceId: template.workspaceId,
      createdById: (template as any).createdById,
      createdAt: (template as any).createdAt,
    });
  }

  /**
   * Phase 4.5 (Template Center): Duplicate a project via the canonical
   * "save as template → instantiate → cleanup" path.
   *
   * This unifies the duplicate flow with save-as-template plumbing so there
   * is one canonical reuse model. Live execution data is never carried over
   * (status, assignees, dates, comments are excluded by Option B snapshot).
   *
   * Steps:
   *  1. saveProjectAsTemplate(source) — creates a transient WORKSPACE template
   *     marked with `metadata.transient = true`
   *  2. instantiateV51(template, newName) — creates the new project, seeding
   *     creator into team_member_ids
   *  3. soft-delete the transient template (archived_at) so it does not
   *     pollute the workspace template library
   *
   * Owner-only (admin override).
   */
  @Post(':id/duplicate')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_owner', { allowAdminOverride: true })
  async duplicate(
    @Param('id') id: string,
    @Body() body: { newName: string },
    @GetTenant() tenant: TenantContext,
    @Req() req: Request,
  ) {
    if (!body?.newName || !body.newName.trim()) {
      throw new BadRequestException({
        code: 'NAME_REQUIRED',
        message: 'newName is required',
      });
    }
    const newName = body.newName.trim();

    // Phase 4.6: read source team + PM up front so we can carry them into the
    // new project after instantiate. Without this, the duplicated project
    // would only contain the duplicator (instantiate-v5_1 default).
    const sourceTeam = await this.projectsService.getProjectTeam(
      id,
      tenant.organizationId,
    );

    // Step 1: snapshot via save-as-template plumbing.
    // Use a transient marker name so collisions never affect the user's library.
    const transientName = `__duplicate__${id}__${Date.now()}`;
    const tempTemplate = await this.projectsService.saveProjectAsTemplate(
      id,
      tenant.organizationId,
      tenant.userId,
      { name: transientName },
    );

    try {
      // Step 2: instantiate via canonical instantiate-v5_1.
      const result = await this.templatesInstantiateV51Service.instantiateV51(
        tempTemplate.id,
        { projectName: newName } as any,
        (tempTemplate as any).workspaceId,
        tenant.organizationId,
        tenant.userId,
      );

      // Step 3: cleanup the transient template (archive — never visible).
      await this.projectsService.archiveTransientTemplate(
        tempTemplate.id,
        tenant.organizationId,
      );

      // Step 4: Phase 4.6 — carry source team + PM into the new project.
      // Filtered to current active workspace members; PM preserved if valid.
      const seeded = await this.projectsService.seedDuplicatedProjectTeam(
        result.projectId,
        tenant.organizationId,
        sourceTeam.teamMemberIds,
        sourceTeam.projectManagerId,
      );

      return formatResponse({
        sourceProjectId: id,
        newProjectId: result.projectId,
        newProjectName: result.projectName,
        phaseCount: result.phaseCount,
        taskCount: result.taskCount,
        teamMemberIds: seeded.teamMemberIds,
        projectManagerId: seeded.projectManagerId,
      });
    } catch (err) {
      // Best-effort cleanup on failure
      await this.projectsService
        .archiveTransientTemplate(tempTemplate.id, tenant.organizationId)
        .catch(() => undefined);
      throw err;
    }
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
    const result = await this.projectsService.archiveProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
    return formatResponse(result);
  }

  @Post(':id/restore')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async restore(@Param('id') id: string, @GetTenant() tenant: TenantContext) {
    this.logger.log(`Restoring project ${id} for org ${tenant.organizationId}`);
    const result = await this.projectsService.restoreProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
    return formatResponse(result);
  }

  @Delete(':id')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async remove(@Param('id') id: string, @GetTenant() tenant: TenantContext) {
    this.logger.log(`Deleting project ${id} for org ${tenant.organizationId}`);
    const result = await this.projectsService.deleteProject(
      id,
      tenant.organizationId,
      tenant.userId,
    );
    return formatResponse(result);
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

  /**
   * GET /api/projects/:id/kpis
   * Returns available KPIs for the project plus current activeKpiIds
   */
  @Get(':id/kpis')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_viewer', { allowAdminOverride: true })
  async getProjectKPIs(
    @Param('id') id: string,
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Fetching KPIs for project ${id}`);
    return this.projectsService.getProjectKPIs(
      id,
      tenant.organizationId,
      tenant.userId,
      tenant.userRole,
    );
  }

  /**
   * PATCH /api/projects/:id/kpis
   * Updates activeKpiIds for the project
   * Validates that activeKpiIds are subset of available KPIs
   */
  @Patch(':id/kpis')
  @UseGuards(RequireProjectWorkspaceRoleGuard)
  @RequireWorkspaceRole('workspace_member', { allowAdminOverride: true })
  async updateProjectKPIs(
    @Param('id') id: string,
    @Body() dto: { activeKpiIds: string[] },
    @GetTenant() tenant: TenantContext,
  ) {
    this.logger.log(`Updating KPIs for project ${id}`);
    return this.projectsService.updateProjectKPIs(
      id,
      dto.activeKpiIds,
      tenant.organizationId,
      tenant.userId,
    );
  }
}
