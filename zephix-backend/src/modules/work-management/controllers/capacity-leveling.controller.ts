import {
  Controller,
  Get,
  UseGuards,
  Req,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { CapacityLevelingService } from '../services/capacity-leveling.service';
import { WorkspaceRoleGuardService } from '../../workspace-access/workspace-role-guard.service';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { RequireEntitlement } from '../../billing/entitlements/require-entitlement.guard';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@ApiTags('capacity')
@ApiBearerAuth()
@Controller('work/workspaces/:workspaceId/capacity/leveling')
@UseGuards(JwtAuthGuard)
@RequireEntitlement('capacity_engine')
export class CapacityLevelingController {
  constructor(
    private readonly levelingService: CapacityLevelingService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /work/workspaces/:workspaceId/capacity/leveling/recommendations?from&to&projectId&threshold
   * Owner or admin only
   */
  @Get('recommendations')
  async getRecommendations(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('projectId') projectId?: string,
    @Query('threshold') thresholdRaw?: string,
  ) {
    const auth = getAuthContext(req);
    if (!UUID_RE.test(workspaceId)) {
      throw new BadRequestException('Invalid workspaceId');
    }
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      throw new BadRequestException('from and to must be YYYY-MM-DD');
    }

    // Only owner/admin can access recommendations
    const role = normalizePlatformRole(auth.platformRole);
    if (role === PlatformRole.VIEWER || role === PlatformRole.MEMBER) {
      // Additionally check workspace role — delivery_owner and workspace_owner allowed
      await this.workspaceRoleGuard.requireWorkspaceWrite(workspaceId, auth.userId);
    }

    const threshold = thresholdRaw ? parseFloat(thresholdRaw) : undefined;

    const result = await this.levelingService.recommend({
      organizationId: auth.organizationId,
      workspaceId,
      fromDate: from,
      toDate: to,
      projectId: projectId && UUID_RE.test(projectId) ? projectId : undefined,
      threshold,
    });

    return this.responseService.success(result);
  }
}
