import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Req,
  Param,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { WorkPlanService } from '../services/work-plan.service';
import { ProjectStartService } from '../services/project-start.service';
import { ProjectOverviewService } from '../services/project-overview.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id is required',
    });
  }
  if (!UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

@Controller('work')
@ApiTags('Work Management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkPlanController {
  constructor(
    private readonly workPlanService: WorkPlanService,
    private readonly projectStartService: ProjectStartService,
    private readonly projectOverviewService: ProjectOverviewService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  // 1. GET /work/projects/:projectId/plan
  @Get('projects/:projectId/plan')
  @ApiOperation({ summary: 'Get work plan for a project' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Work plan retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - project not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async getProjectWorkPlan(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require read access
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const plan = await this.workPlanService.getProjectWorkPlan(
      auth.organizationId,
      workspaceId,
      projectId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(plan);
  }

  // 3. GET /work/programs/:programId/plan
  @Get('programs/:programId/plan')
  @ApiOperation({
    summary: 'Get work plan for a program (aggregates child project plans)',
  })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Work plan retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - program not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async getProgramWorkPlan(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('programId') programId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require read access
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const plan = await this.workPlanService.getProgramWorkPlan(
      auth.organizationId,
      workspaceId,
      programId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(plan);
  }

  // 4. GET /work/projects/:projectId/overview
  @Get('projects/:projectId/overview')
  @ApiOperation({
    summary: 'Get project overview with health and needs attention',
  })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project overview retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - project not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async getProjectOverview(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require read access
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const overview = await this.projectOverviewService.getProjectOverview(
      auth.organizationId,
      workspaceId,
      projectId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(overview);
  }

  // 5. GET /work/programs/:programId/overview
  @Get('programs/:programId/overview')
  @ApiOperation({
    summary: 'Get program overview with aggregated health and needs attention',
  })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({
    status: 200,
    description: 'Program overview retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
    schema: {
      properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - program not found',
    schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } },
  })
  async getProgramOverview(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('programId') programId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require read access
    await this.workspaceRoleGuard.requireWorkspaceRead(
      workspaceId,
      auth.userId,
    );

    const overview = await this.projectOverviewService.getProgramOverview(
      auth.organizationId,
      workspaceId,
      programId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(overview);
  }

  // 6. POST /work/projects/:projectId/start
  @Post('projects/:projectId/start')
  @ApiOperation({ summary: 'Start work on a project' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project started successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied or insufficient role',
    schema: {
      properties: { code: { type: 'string', example: 'FORBIDDEN_ROLE' } },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - invalid state or missing delivery owner',
    schema: {
      properties: {
        code: { type: 'string', example: 'DELIVERY_OWNER_REQUIRED' },
      },
    },
  })
  async startProject(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Require write access
    await this.workspaceRoleGuard.requireWorkspaceWrite(
      workspaceId,
      auth.userId,
    );

    const result = await this.projectStartService.startWork(
      projectId,
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(result);
  }

  // 7. PATCH /work/projects/:projectId/delivery-owner
  @Patch('projects/:projectId/delivery-owner')
  @ApiOperation({ summary: 'Set delivery owner for a project' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Delivery owner set successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only workspace_owner can set delivery owner',
    schema: {
      properties: { code: { type: 'string', example: 'FORBIDDEN_ROLE' } },
    },
  })
  async setDeliveryOwner(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
    @Body() dto: { userId: string },
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    // Sprint 6: Only workspace_owner can set delivery owner
    const role = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      auth.userId,
    );
    if (role !== 'workspace_owner') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Only workspace owner can set delivery owner',
      });
    }

    // Validate target user is in workspace and has delivery_owner or workspace_owner role
    const targetRole = await this.workspaceRoleGuard.getWorkspaceRole(
      workspaceId,
      dto.userId,
    );
    if (
      !targetRole ||
      (targetRole !== 'delivery_owner' && targetRole !== 'workspace_owner')
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message:
          'Target user must be delivery_owner or workspace_owner in this workspace',
      });
    }

    const result = await this.projectStartService.setDeliveryOwner(
      projectId,
      workspaceId,
      auth.organizationId,
      auth.userId,
      dto.userId,
    );

    return this.responseService.success(result);
  }
}
