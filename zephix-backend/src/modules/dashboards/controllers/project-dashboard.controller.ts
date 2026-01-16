/**
 * Phase 7.5: Project Dashboard Controller
 * Provides dashboard endpoints scoped by workspace with KPI filtering
 */
import {
  Controller,
  Get,
  UseGuards,
  Param,
  Headers,
  Req,
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
import { ProjectDashboardService } from '../services/project-dashboard.service';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';

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

@Controller('dashboards/project')
@ApiTags('Project Dashboards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectDashboardController {
  constructor(
    private readonly dashboardService: ProjectDashboardService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /api/dashboards/project/:projectId/summary
   * Returns project summary: health, behindTargetDays, counts, overdue, blocked
   */
  @Get(':projectId/summary')
  @ApiOperation({ summary: 'Get project dashboard summary' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - project not found',
  })
  async getProjectSummary(
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const summary = await this.dashboardService.getProjectSummary(
      projectId,
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );

    return this.responseService.success(summary);
  }

  /**
   * GET /api/dashboards/project/:projectId/kpis
   * Returns active KPIs only, with computed values if available
   */
  @Get(':projectId/kpis')
  @ApiOperation({ summary: 'Get project dashboard KPIs (active only)' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'KPIs retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - project not found',
  })
  async getProjectKPIs(
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const kpis = await this.dashboardService.getProjectKPIs(
      projectId,
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );

    return this.responseService.success(kpis);
  }

  /**
   * GET /api/dashboards/project/:projectId/work
   * Returns work dashboard: phase rollups, status counts, top blockers
   */
  @Get(':projectId/work')
  @ApiOperation({ summary: 'Get project dashboard work data' })
  @ApiHeader({
    name: 'x-workspace-id',
    description: 'Workspace ID',
    required: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Work data retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - workspace access denied',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - project not found',
  })
  async getProjectWork(
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Req() req: AuthRequest,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const work = await this.dashboardService.getProjectWork(
      projectId,
      workspaceId,
      auth.organizationId,
      auth.userId,
      auth.platformRole,
    );

    return this.responseService.success(work);
  }
}
