/**
 * Phase 2D: Portfolio Analytics Controller Tests
 * Covers: role gating, access control enforcement, route behavior.
 */
import { PortfolioAnalyticsController } from '../portfolio-analytics.controller';
import { ForbiddenException } from '@nestjs/common';

describe('PortfolioAnalyticsController', () => {
  let controller: PortfolioAnalyticsController;
  const mockAnalyticsService = {
    getPortfolioHealth: jest.fn(),
    getPortfolioCriticalPathRisk: jest.fn(),
    getPortfolioBaselineDrift: jest.fn(),
  };
  const mockPortfoliosService = {
    addProjects: jest.fn(),
    removeProjects: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PortfolioAnalyticsController(
      mockAnalyticsService as any,
      mockPortfoliosService as any,
    );
  });

  const adminReq = { user: { organizationId: 'org-1', platformRole: 'ADMIN' } };
  const memberReq = { user: { organizationId: 'org-1', platformRole: 'MEMBER' } };
  const viewerReq = { user: { organizationId: 'org-1', platformRole: 'VIEWER' } };
  const mockRes = { setHeader: jest.fn() } as any;

  // ── Health endpoint ─────────────────────────────────────────────────

  describe('GET /portfolios/:id/health', () => {
    it('returns health for ADMIN', async () => {
      mockAnalyticsService.getPortfolioHealth.mockResolvedValue({
        projectCount: 3,
        totalBudget: 300000,
      });
      const result = await controller.getHealth('pf-1', adminReq, mockRes);
      expect(result.success).toBe(true);
      expect(result.data.projectCount).toBe(3);
    });

    it('returns health for MEMBER (read-only allowed)', async () => {
      mockAnalyticsService.getPortfolioHealth.mockResolvedValue({
        projectCount: 2,
      });
      const result = await controller.getHealth('pf-1', memberReq, mockRes);
      expect(result.success).toBe(true);
    });

    it('returns health for VIEWER (read-only allowed)', async () => {
      mockAnalyticsService.getPortfolioHealth.mockResolvedValue({
        projectCount: 1,
      });
      const result = await controller.getHealth('pf-1', viewerReq, mockRes);
      expect(result.success).toBe(true);
    });

    it('sets performance warning header for >50 projects', async () => {
      mockAnalyticsService.getPortfolioHealth.mockResolvedValue({
        projectCount: 55,
      });
      await controller.getHealth('pf-1', adminReq, mockRes);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Zephix-Portfolio-Warning',
        'Large portfolio aggregation',
      );
    });
  });

  // ── Critical Risk endpoint ──────────────────────────────────────────

  describe('GET /portfolios/:id/critical-risk', () => {
    it('returns critical risk data', async () => {
      mockAnalyticsService.getPortfolioCriticalPathRisk.mockResolvedValue({
        projectsWithSlip: 2,
      });
      const result = await controller.getCriticalRisk('pf-1', adminReq);
      expect(result.success).toBe(true);
    });
  });

  // ── Baseline Drift endpoint ─────────────────────────────────────────

  describe('GET /portfolios/:id/baseline-drift', () => {
    it('returns baseline drift data', async () => {
      mockAnalyticsService.getPortfolioBaselineDrift.mockResolvedValue({
        projectsWithBaseline: 3,
      });
      const result = await controller.getBaselineDrift('pf-1', adminReq);
      expect(result.success).toBe(true);
    });
  });

  // ── Add project — ADMIN only ────────────────────────────────────────

  describe('POST /portfolios/:id/projects/:projectId', () => {
    it('allows ADMIN to add project', async () => {
      mockPortfoliosService.addProjects.mockResolvedValue(undefined);
      const result = await controller.addProject('pf-1', 'p1', adminReq);
      expect(result.success).toBe(true);
      expect(mockPortfoliosService.addProjects).toHaveBeenCalledWith(
        'pf-1',
        { projectIds: ['p1'] },
        'org-1',
      );
    });

    it('blocks MEMBER from adding project', async () => {
      await expect(controller.addProject('pf-1', 'p1', memberReq))
        .rejects.toThrow(ForbiddenException);
      expect(mockPortfoliosService.addProjects).not.toHaveBeenCalled();
    });

    it('blocks VIEWER from adding project', async () => {
      await expect(controller.addProject('pf-1', 'p1', viewerReq))
        .rejects.toThrow(ForbiddenException);
    });
  });

  // ── Remove project — ADMIN only ─────────────────────────────────────

  describe('DELETE /portfolios/:id/projects/:projectId', () => {
    it('allows ADMIN to remove project', async () => {
      mockPortfoliosService.removeProjects.mockResolvedValue(undefined);
      const result = await controller.removeProject('pf-1', 'p1', adminReq);
      expect(result.success).toBe(true);
    });

    it('blocks MEMBER from removing project', async () => {
      await expect(controller.removeProject('pf-1', 'p1', memberReq))
        .rejects.toThrow(ForbiddenException);
    });

    it('blocks VIEWER from removing project', async () => {
      await expect(controller.removeProject('pf-1', 'p1', viewerReq))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
