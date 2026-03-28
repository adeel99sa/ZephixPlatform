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
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseService } from '../../../shared/services/response.service';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { PlatformRole } from '../../../shared/enums/platform-roles.enum';
import { ProjectCostService } from '../services/project-cost.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Workspace roles allowed to access financial rollup data.
 * Isolated here to reduce inline string typo risk.
 * delivery_owner is an extended role not in the base WorkspaceRole type.
 */
const COST_ROLLUP_ALLOWED_ROLES = new Set(['workspace_owner', 'delivery_owner']);

function validateWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId || !UUID_REGEX.test(workspaceId)) {
    throw new ForbiddenException({
      code: 'WORKSPACE_REQUIRED',
      message: 'Workspace header x-workspace-id must be a valid UUID',
    });
  }
  return workspaceId;
}

@Controller('work/projects')
@ApiTags('Budget & Cost')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectCostController {
  constructor(
    private readonly projectCostService: ProjectCostService,
    private readonly responseService: ResponseService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
  ) {}

  @Get(':projectId/cost-summary')
  @ApiOperation({ summary: 'Get project cost summary (planned, actual, forecast)' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getCostSummary(
    @Req() req: AuthRequest,
    @Param('projectId') projectId: string,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId, platformRole } = getAuthContext(req);

    // C2 Fix: Block VIEWER (Guest) from cost endpoints — financial data is restricted
    await this.workspaceRoleGuard.requireWorkspaceRead(wsId, userId);
    if (platformRole === PlatformRole.VIEWER) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Cost data is not accessible to guest users',
      });
    }

    const summary = await this.projectCostService.getProjectCostSummary(
      organizationId,
      projectId,
    );
    return this.responseService.success(summary);
  }

  @Get('cost-rollup')
  @ApiOperation({ summary: 'Workspace cost rollup across projects' })
  @ApiHeader({ name: 'x-workspace-id', required: true })
  async getCostRollup(
    @Req() req: AuthRequest,
    @Headers('x-workspace-id') workspaceId: string,
  ) {
    const wsId = validateWorkspaceId(workspaceId);
    const { userId, organizationId, platformRole } = getAuthContext(req);

    // C3 Fix: Restrict workspace cost rollup to workspace_owner or delivery_owner (Admin/Owner)
    // VIEWER and MEMBER cannot access aggregate financial data
    const role = await this.workspaceRoleGuard.getWorkspaceRole(wsId, userId);
    if (!role) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'You are not a member of this workspace',
      });
    }
    if (!COST_ROLLUP_ALLOWED_ROLES.has(role) && platformRole !== PlatformRole.ADMIN) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_ROLE',
        message: 'Cost rollup is restricted to workspace owners and platform admins',
      });
    }

    const rollup = await this.projectCostService.getWorkspaceCostRollup(
      organizationId,
      wsId,
    );
    return this.responseService.success(rollup);
  }
}
