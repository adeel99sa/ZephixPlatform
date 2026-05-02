/**
 * Phase 2D: Portfolio Executive Analytics Controller
 *
 * Executive-level cross-project visibility. Read-only for MEMBER/VIEWER;
 * portfolio–project attach/detach ADMIN-only.
 *
 * Workspace isolation (2026-05): All routes require x-workspace-id and enforce
 * that the portfolio (and mutation targets) belong to that workspace.
 * Org-only access without workspace context is rejected (400).
 *
 * Note: 403 + AppException on workspace mismatch is intentional here; project
 * link under workspaces/:id uses 404 in places to avoid existence leakage — different surface.
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  Res,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PortfolioAnalyticsService } from '../services/portfolio-analytics.service';
import { PortfoliosService } from '../services/portfolios.service';
import {
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import { RequireEntitlement } from '../../billing/entitlements/require-entitlement.guard';
import { TenantContextService } from '../../tenancy/tenant-context.service';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import { getAuthContext } from '../../../common/http/get-auth-context';
import type { AuthRequest } from '../../../common/http/auth-request';
import { Project } from '../../projects/entities/project.entity';
import type { Portfolio } from '../entities/portfolio.entity';
import { AppException } from '../../../shared/errors/app-exception';
import { ErrorCode } from '../../../shared/errors/error-codes';

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
  constructor(
    private readonly analyticsService: PortfolioAnalyticsService,
    private readonly portfoliosService: PortfoliosService,
    private readonly tenantContextService: TenantContextService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Validates x-workspace-id (via tenant context), membership, returns context.
   */
  private async resolveAnalyticsContext(req: AuthRequest): Promise<{
    organizationId: string;
    userId: string;
    platformRole: string;
    workspaceId: string;
  }> {
    const { organizationId, userId, platformRole } = getAuthContext(req);
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const workspaceId = this.tenantContextService.getWorkspaceId();
    if (!workspaceId?.trim()) {
      throw new BadRequestException('Workspace context required');
    }

    const canAccess = await this.workspaceAccessService.canAccessWorkspace(
      workspaceId,
      organizationId,
      userId,
      normalizePlatformRole(platformRole),
    );
    if (!canAccess) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, 'Workspace access denied', 403);
    }

    return {
      organizationId,
      userId,
      platformRole: String(platformRole ?? ''),
      workspaceId,
    };
  }

  /** Portfolio must exist in org and match active workspace from header. */
  private async requirePortfolioInActiveWorkspace(
    portfolioId: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<Portfolio> {
    const portfolio = await this.portfoliosService.getByIdLegacy(
      portfolioId,
      organizationId,
    );
    if (portfolio.workspaceId !== workspaceId) {
      throw new AppException(
        ErrorCode.AUTH_FORBIDDEN,
        'Portfolio does not belong to the active workspace',
        403,
      );
    }
    return portfolio;
  }

  /** For attach/detach: project must sit in the same workspace as the portfolio and header. */
  private async assertProjectAlignedForPortfolioMutation(
    projectId: string,
    portfolioWorkspaceId: string,
    organizationId: string,
    activeWorkspaceId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.workspaceId !== activeWorkspaceId) {
      throw new AppException(
        ErrorCode.AUTH_FORBIDDEN,
        'Project does not belong to the active workspace',
        403,
      );
    }
    if (project.workspaceId !== portfolioWorkspaceId) {
      throw new AppException(
        ErrorCode.AUTH_FORBIDDEN,
        'Project and portfolio must belong to the same workspace',
        403,
      );
    }
  }

  // ── GET /portfolios/:id/health ─────────────────────────────────────

  @Get(':portfolioId/health')
  async getHealth(
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = await this.resolveAnalyticsContext(req);
    await this.requirePortfolioInActiveWorkspace(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    const result = await this.analyticsService.getPortfolioHealth(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    if (result.projectCount > 50) {
      res.setHeader('X-Zephix-Portfolio-Warning', 'Large portfolio aggregation');
    }

    return { success: true, data: result };
  }

  // ── GET /portfolios/:id/critical-risk ──────────────────────────────

  @Get(':portfolioId/critical-risk')
  async getCriticalRisk(
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = await this.resolveAnalyticsContext(req);
    await this.requirePortfolioInActiveWorkspace(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    const result = await this.analyticsService.getPortfolioCriticalPathRisk(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );
    return { success: true, data: result };
  }

  // ── GET /portfolios/:id/baseline-drift ─────────────────────────────

  @Get(':portfolioId/baseline-drift')
  async getBaselineDrift(
    @Param('portfolioId') portfolioId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = await this.resolveAnalyticsContext(req);
    await this.requirePortfolioInActiveWorkspace(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    const result = await this.analyticsService.getPortfolioBaselineDrift(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );
    return { success: true, data: result };
  }

  // ── POST /portfolios/:id/projects/:projectId ──────────────────────

  @Post(':portfolioId/projects/:projectId')
  async addProject(
    @Param('portfolioId') portfolioId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = await this.resolveAnalyticsContext(req);
    requireAdmin(ctx.platformRole);

    const portfolio = await this.requirePortfolioInActiveWorkspace(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    await this.assertProjectAlignedForPortfolioMutation(
      projectId,
      portfolio.workspaceId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    await this.portfoliosService.addProjects(
      portfolioId,
      { projectIds: [projectId] },
      ctx.organizationId,
      { userId: ctx.userId, platformRole: ctx.platformRole },
    );
    return { success: true };
  }

  // ── DELETE /portfolios/:id/projects/:projectId ─────────────────────

  @Delete(':portfolioId/projects/:projectId')
  async removeProject(
    @Param('portfolioId') portfolioId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthRequest,
  ) {
    const ctx = await this.resolveAnalyticsContext(req);
    requireAdmin(ctx.platformRole);

    const portfolio = await this.requirePortfolioInActiveWorkspace(
      portfolioId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    await this.assertProjectAlignedForPortfolioMutation(
      projectId,
      portfolio.workspaceId,
      ctx.organizationId,
      ctx.workspaceId,
    );

    await this.portfoliosService.removeProjects(
      portfolioId,
      { projectIds: [projectId] },
      ctx.organizationId,
      { userId: ctx.userId, platformRole: ctx.platformRole },
    );
    return { success: true };
  }
}
