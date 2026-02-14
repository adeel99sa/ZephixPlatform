/**
 * Phase 2D: Portfolio Executive Analytics Controller
 *
 * Provides executive-level portfolio intelligence endpoints.
 * Read-only for MEMBER/VIEWER. CRUD only for ADMIN.
 * All scoped by organizationId.
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortfolioAnalyticsService } from '../services/portfolio-analytics.service';
import { PortfoliosService } from '../services/portfolios.service';
import {
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import { RequireEntitlement } from '../../billing/entitlements/require-entitlement.guard';

function requireAdmin(platformRole: string): void {
  const role = normalizePlatformRole(platformRole);
  if (!isAdminRole(role)) {
    throw new ForbiddenException('Only platform ADMIN can perform this action');
  }
}

@Controller('portfolios')
@UseGuards(JwtAuthGuard)
@RequireEntitlement('portfolio_rollups')
export class PortfolioAnalyticsController {
  private readonly logger = new Logger(PortfolioAnalyticsController.name);

  constructor(
    private readonly analyticsService: PortfolioAnalyticsService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  // ── GET /portfolios/:id/health ─────────────────────────────────────

  @Get(':portfolioId/health')
  async getHealth(
    @Param('portfolioId') portfolioId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { organizationId } = req.user;
    const result = await this.analyticsService.getPortfolioHealth(
      portfolioId,
      organizationId,
    );

    // Performance guard
    if (result.projectCount > 50) {
      res.setHeader('X-Zephix-Portfolio-Warning', 'Large portfolio aggregation');
    }

    return { success: true, data: result };
  }

  // ── GET /portfolios/:id/critical-risk ──────────────────────────────

  @Get(':portfolioId/critical-risk')
  async getCriticalRisk(
    @Param('portfolioId') portfolioId: string,
    @Req() req: any,
  ) {
    const { organizationId } = req.user;
    const result = await this.analyticsService.getPortfolioCriticalPathRisk(
      portfolioId,
      organizationId,
    );
    return { success: true, data: result };
  }

  // ── GET /portfolios/:id/baseline-drift ─────────────────────────────

  @Get(':portfolioId/baseline-drift')
  async getBaselineDrift(
    @Param('portfolioId') portfolioId: string,
    @Req() req: any,
  ) {
    const { organizationId } = req.user;
    const result = await this.analyticsService.getPortfolioBaselineDrift(
      portfolioId,
      organizationId,
    );
    return { success: true, data: result };
  }

  // ── POST /portfolios/:id/projects/:projectId ──────────────────────

  @Post(':portfolioId/projects/:projectId')
  async addProject(
    @Param('portfolioId') portfolioId: string,
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const { organizationId, platformRole } = req.user;
    requireAdmin(platformRole);

    await this.portfoliosService.addProjects(
      portfolioId,
      { projectIds: [projectId] },
      organizationId,
    );
    return { success: true };
  }

  // ── DELETE /portfolios/:id/projects/:projectId ─────────────────────

  @Delete(':portfolioId/projects/:projectId')
  async removeProject(
    @Param('portfolioId') portfolioId: string,
    @Param('projectId') projectId: string,
    @Req() req: any,
  ) {
    const { organizationId, platformRole } = req.user;
    requireAdmin(platformRole);

    await this.portfoliosService.removeProjects(
      portfolioId,
      { projectIds: [projectId] },
      organizationId,
    );
    return { success: true };
  }
}
