/**
 * Phase 2D: Portfolio Analytics Controller Tests
 * Covers: role gating, route behavior (workspace isolation covered by integration suite).
 */
import { PortfolioAnalyticsController } from '../portfolio-analytics.controller';
import { ForbiddenException } from '@nestjs/common';
import type { AuthRequest } from '../../../../common/http/auth-request';

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
    getByIdLegacy: jest.fn(),
  };
  const mockTenantContext = {
    getWorkspaceId: jest.fn(),
  };
  const mockWorkspaceAccess = {
    canAccessWorkspace: jest.fn(),
  };
  const mockProjectRepo = {
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTenantContext.getWorkspaceId.mockReturnValue('ws-1');
    mockWorkspaceAccess.canAccessWorkspace.mockResolvedValue(true);
    mockPortfoliosService.getByIdLegacy.mockResolvedValue({
      id: 'pf-1',
      workspaceId: 'ws-1',
    });
    controller = new PortfolioAnalyticsController(
      mockAnalyticsService as any,
      mockPortfoliosService as any,
      mockTenantContext as any,
      mockWorkspaceAccess as any,
      mockProjectRepo as any,
    );
  });

  const adminReq = {
    user: { id: 'user-1', organizationId: 'org-1', platformRole: 'ADMIN' },
  } as AuthRequest;
  const memberReq = {
    user: { id: 'user-1', organizationId: 'org-1', platformRole: 'MEMBER' },
  } as AuthRequest;
  const viewerReq = {
    user: { id: 'user-1', organizationId: 'org-1', platformRole: 'VIEWER' },
  } as AuthRequest;
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
      expect(mockAnalyticsService.getPortfolioHealth).toHaveBeenCalledWith(
        'pf-1',
        'org-1',
        'ws-1',
      );
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
      mockProjectRepo.findOne.mockResolvedValue({
        id: 'p1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
      });
      mockPortfoliosService.addProjects.mockResolvedValue(undefined);
      const result = await controller.addProject('pf-1', 'p1', adminReq);
      expect(result.success).toBe(true);
      expect(mockPortfoliosService.addProjects).toHaveBeenCalledWith(
        'pf-1',
        { projectIds: ['p1'] },
        'org-1',
        { userId: 'user-1', platformRole: 'ADMIN' },
      );
    });

    it('blocks MEMBER from adding project', async () => {
      await expect(controller.addProject('pf-1', 'p1', memberReq)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPortfoliosService.addProjects).not.toHaveBeenCalled();
    });

    it('blocks VIEWER from adding project', async () => {
      await expect(controller.addProject('pf-1', 'p1', viewerReq)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── Remove project — ADMIN only ─────────────────────────────────────

  describe('DELETE /portfolios/:id/projects/:projectId', () => {
    it('allows ADMIN to remove project', async () => {
      mockProjectRepo.findOne.mockResolvedValue({
        id: 'p1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
      });
      mockPortfoliosService.removeProjects.mockResolvedValue(undefined);
      const result = await controller.removeProject('pf-1', 'p1', adminReq);
      expect(result.success).toBe(true);
    });

    it('blocks MEMBER from removing project', async () => {
      await expect(controller.removeProject('pf-1', 'p1', memberReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks VIEWER from removing project', async () => {
      await expect(controller.removeProject('pf-1', 'p1', viewerReq)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
