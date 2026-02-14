/**
 * Phase 4A: Organization Analytics Controller
 *
 * Cross-workspace executive analytics. Platform ADMIN only.
 * All endpoints read-only. Thin controller — logic in service.
 */
import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../../common/http/auth-request';
import { getAuthContext } from '../../../common/http/get-auth-context';
import {
  normalizePlatformRole,
  PlatformRole,
} from '../../../shared/enums/platform-roles.enum';
import { PlanRateLimit } from '../../../shared/guards/plan-rate-limit.guard';
import { AppException } from '../../../shared/errors/app-exception';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { OrganizationAnalyticsService } from '../services/organization-analytics.service';

const LARGE_ORG_HEADER = 'X-Zephix-Org-Warning';
const LARGE_ORG_VALUE = 'Large org aggregation';

@ApiTags('Organization Analytics')
@ApiBearerAuth()
@Controller('org/analytics')
@UseGuards(JwtAuthGuard)
export class OrganizationAnalyticsController {
  constructor(
    private readonly analyticsService: OrganizationAnalyticsService,
  ) {}

  /** Enforce platform ADMIN. Throws 403 for MEMBER/VIEWER via AppException. */
  private assertAdmin(req: AuthRequest): { organizationId: string } {
    const auth = getAuthContext(req);
    const role = normalizePlatformRole(auth.platformRole);
    if (role !== PlatformRole.ADMIN) {
      throw new AppException(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization analytics requires platform ADMIN role',
        HttpStatus.FORBIDDEN,
      );
    }
    return { organizationId: auth.organizationId };
  }

  private async maybeAddLargeOrgHeader(
    orgId: string,
    res: Response,
  ): Promise<void> {
    const isLarge = await this.analyticsService.isLargeOrg(orgId);
    if (isLarge) {
      res.setHeader(LARGE_ORG_HEADER, LARGE_ORG_VALUE);
    }
  }

  /** Add capability-warning header when DTO has warnings */
  private addWarningsHeader(res: Response, data: { warnings?: string[] }): void {
    if (data.warnings && data.warnings.length > 0) {
      res.setHeader(LARGE_ORG_HEADER, data.warnings.join('; '));
    }
  }

  @Get('summary')
  @PlanRateLimit('standard')
  async getSummary(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const { organizationId } = this.assertAdmin(req);
    await this.maybeAddLargeOrgHeader(organizationId, res);
    const data = await this.analyticsService.getSummary(organizationId);
    this.addWarningsHeader(res, data);
    return { data };
  }

  @Get('capacity')
  @PlanRateLimit('compute')
  async getCapacity(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const { organizationId } = this.assertAdmin(req);
    await this.maybeAddLargeOrgHeader(organizationId, res);
    const data = await this.analyticsService.getCapacity(organizationId);
    this.addWarningsHeader(res, data);
    return { data };
  }

  @Get('storage')
  @PlanRateLimit('standard')
  async getStorage(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const { organizationId } = this.assertAdmin(req);
    await this.maybeAddLargeOrgHeader(organizationId, res);
    const data = await this.analyticsService.getStorage(organizationId);
    this.addWarningsHeader(res, data);
    return { data };
  }

  @Get('scenarios')
  @PlanRateLimit('standard')
  async getScenarios(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const { organizationId } = this.assertAdmin(req);
    await this.maybeAddLargeOrgHeader(organizationId, res);
    const data = await this.analyticsService.getScenarios(organizationId);
    this.addWarningsHeader(res, data);
    return { data };
  }

  @Get('audit')
  @PlanRateLimit('standard')
  async getAudit(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const { organizationId } = this.assertAdmin(req);
    await this.maybeAddLargeOrgHeader(organizationId, res);
    const data = await this.analyticsService.getAuditSummary(organizationId);
    this.addWarningsHeader(res, data);
    return { data };
  }
}
