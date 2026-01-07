import {
  Controller,
  Get,
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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    private readonly responseService: ResponseService,
  ) {}

  // 1. GET /work/projects/:projectId/plan
  @Get('projects/:projectId/plan')
  @ApiOperation({ summary: 'Get work plan for a project' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID', required: true })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Work plan retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied', schema: { properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } } } })
  @ApiResponse({ status: 404, description: 'Not found - project not found', schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } } })
  async getProjectWorkPlan(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('projectId') projectId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const plan = await this.workPlanService.getProjectWorkPlan(
      auth.organizationId,
      workspaceId,
      projectId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(plan);
  }

  // 2. GET /work/programs/:programId/plan
  @Get('programs/:programId/plan')
  @ApiOperation({ summary: 'Get work plan for a program (aggregates child project plans)' })
  @ApiHeader({ name: 'x-workspace-id', description: 'Workspace ID', required: true })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Work plan retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - workspace access denied', schema: { properties: { code: { type: 'string', example: 'WORKSPACE_REQUIRED' } } } })
  @ApiResponse({ status: 404, description: 'Not found - program not found', schema: { properties: { code: { type: 'string', example: 'NOT_FOUND' } } } })
  async getProgramWorkPlan(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceIdHeader: string,
    @Param('programId') programId: string,
  ) {
    const workspaceId = validateWorkspaceId(workspaceIdHeader);
    const auth = getAuthContext(req);

    const plan = await this.workPlanService.getProgramWorkPlan(
      auth.organizationId,
      workspaceId,
      programId,
      auth.userId,
      auth.platformRole,
    );
    return this.responseService.success(plan);
  }
}

