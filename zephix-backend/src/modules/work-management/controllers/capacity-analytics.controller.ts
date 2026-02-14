import {
  Controller,
  Get,
  UseGuards,
  Req,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import { ResponseService } from '../../../shared/services/response.service';
import { CapacityAnalyticsService } from '../services/capacity-analytics.service';
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
@Controller('work/workspaces/:workspaceId/capacity')
@UseGuards(JwtAuthGuard)
@RequireEntitlement('capacity_engine')
export class CapacityAnalyticsController {
  constructor(
    private readonly analyticsService: CapacityAnalyticsService,
    private readonly workspaceRoleGuard: WorkspaceRoleGuardService,
    private readonly responseService: ResponseService,
  ) {}

  /**
   * GET /work/workspaces/:workspaceId/capacity/utilization?from&to&userIds&threshold
   * Read access: all workspace members
   * VIEWER: safe output only (no cost/salary data — this endpoint has none)
   */
  @Get('utilization')
  async getUtilization(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('userIds') userIdsRaw?: string,
    @Query('threshold') thresholdRaw?: string,
  ) {
    const auth = getAuthContext(req);
    if (!UUID_RE.test(workspaceId)) {
      throw new BadRequestException('Invalid workspaceId');
    }
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      throw new BadRequestException('from and to must be YYYY-MM-DD');
    }

    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    const role = normalizePlatformRole(auth.platformRole);
    const userIds = userIdsRaw
      ? userIdsRaw.split(',').filter((id) => UUID_RE.test(id.trim()))
      : undefined;
    const threshold = thresholdRaw ? parseFloat(thresholdRaw) : undefined;

    const result = await this.analyticsService.computeUtilization({
      organizationId: auth.organizationId,
      workspaceId,
      fromDate: from,
      toDate: to,
      userIds,
      threshold,
      includeDisabled: role === PlatformRole.ADMIN,
    });

    return this.responseService.success(result);
  }

  /**
   * GET /work/workspaces/:workspaceId/capacity/overallocations?from&to&userIds&threshold
   * Read access: all workspace members
   */
  @Get('overallocations')
  async getOverallocations(
    @Req() req: AuthRequest,
    @Param('workspaceId') workspaceId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('userIds') userIdsRaw?: string,
    @Query('threshold') thresholdRaw?: string,
  ) {
    const auth = getAuthContext(req);
    if (!UUID_RE.test(workspaceId)) {
      throw new BadRequestException('Invalid workspaceId');
    }
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      throw new BadRequestException('from and to must be YYYY-MM-DD');
    }

    await this.workspaceRoleGuard.requireWorkspaceRead(workspaceId, auth.userId);

    const role = normalizePlatformRole(auth.platformRole);
    const userIds = userIdsRaw
      ? userIdsRaw.split(',').filter((id) => UUID_RE.test(id.trim()))
      : undefined;
    const threshold = thresholdRaw ? parseFloat(thresholdRaw) : undefined;

    const result = await this.analyticsService.computeOverallocations({
      organizationId: auth.organizationId,
      workspaceId,
      fromDate: from,
      toDate: to,
      userIds,
      threshold,
      includeDisabled: role === PlatformRole.ADMIN,
    });

    return this.responseService.success(result);
  }
}
