/**
 * Phase 4A: OrganizationAnalyticsController Tests
 *
 * Covers: role gating, rate limit decorator, response shape, large org header.
 */
import { OrganizationAnalyticsController } from '../controllers/organization-analytics.controller';
import { HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../../shared/errors/app-exception';
import { ErrorCode } from '../../../shared/errors/error-codes';
import { PLAN_RATE_LIMIT_KEY } from '../../../shared/guards/plan-rate-limit.guard';
import {
  OrgAnalyticsSummaryDto,
} from '../dto/org-analytics-summary.dto';
import {
  OrgAnalyticsCapacityDto,
} from '../dto/org-analytics-capacity.dto';
import {
  OrgAnalyticsStorageDto,
} from '../dto/org-analytics-storage.dto';
import {
  OrgAnalyticsScenariosDto,
} from '../dto/org-analytics-scenarios.dto';
import {
  OrgAnalyticsAuditDto,
} from '../dto/org-analytics-audit.dto';

describe('OrganizationAnalyticsController', () => {
  let controller: OrganizationAnalyticsController;
  let mockService: any;

  const adminReq = (orgId = 'org-1') =>
    ({ user: { id: 'u1', organizationId: orgId, platformRole: 'ADMIN' } }) as any;
  const memberReq = () =>
    ({ user: { id: 'u2', organizationId: 'org-1', platformRole: 'MEMBER' } }) as any;
  const viewerReq = () =>
    ({ user: { id: 'u3', organizationId: 'org-1', platformRole: 'VIEWER' } }) as any;
  const noUserReq = () => ({ user: null }) as any;

  const mockRes = () => {
    const headers: Record<string, string> = {};
    return {
      setHeader: jest.fn((k: string, v: string) => { headers[k] = v; }),
      _headers: headers,
    } as any;
  };

  beforeEach(() => {
    mockService = {
      getSummary: jest.fn().mockResolvedValue(new OrgAnalyticsSummaryDto()),
      getCapacity: jest.fn().mockResolvedValue(new OrgAnalyticsCapacityDto()),
      getStorage: jest.fn().mockResolvedValue(new OrgAnalyticsStorageDto()),
      getScenarios: jest.fn().mockResolvedValue(new OrgAnalyticsScenariosDto()),
      getAuditSummary: jest.fn().mockResolvedValue(new OrgAnalyticsAuditDto()),
      isLargeOrg: jest.fn().mockResolvedValue(false),
    };
    controller = new OrganizationAnalyticsController(mockService);
  });

  // ─── Role gating ─────────────────────────────────────────────

  describe('role gating', () => {
    it('ADMIN can access summary', async () => {
      const result = await controller.getSummary(adminReq(), mockRes());
      expect(result.data).toBeDefined();
    });

    it('MEMBER is blocked from summary with AppException', async () => {
      await expect(controller.getSummary(memberReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('VIEWER is blocked from summary with AppException', async () => {
      await expect(controller.getSummary(viewerReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('ADMIN can access capacity', async () => {
      const result = await controller.getCapacity(adminReq(), mockRes());
      expect(result.data).toBeDefined();
    });

    it('MEMBER is blocked from capacity with AppException', async () => {
      await expect(controller.getCapacity(memberReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('VIEWER is blocked from capacity with AppException', async () => {
      await expect(controller.getCapacity(viewerReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('ADMIN can access storage', async () => {
      const result = await controller.getStorage(adminReq(), mockRes());
      expect(result.data).toBeDefined();
    });

    it('MEMBER is blocked from storage with AppException', async () => {
      await expect(controller.getStorage(memberReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('ADMIN can access scenarios', async () => {
      const result = await controller.getScenarios(adminReq(), mockRes());
      expect(result.data).toBeDefined();
    });

    it('MEMBER is blocked from scenarios with AppException', async () => {
      await expect(controller.getScenarios(memberReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('ADMIN can access audit', async () => {
      const result = await controller.getAudit(adminReq(), mockRes());
      expect(result.data).toBeDefined();
    });

    it('VIEWER is blocked from audit with AppException', async () => {
      await expect(controller.getAudit(viewerReq(), mockRes())).rejects.toThrow(
        AppException,
      );
    });

    it('thrown error is AppException with AUTH_FORBIDDEN code and 403 status', async () => {
      try {
        await controller.getSummary(memberReq(), mockRes());
        fail('Expected AppException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppException);
        expect(err.getStatus()).toBe(403);
        const resp = err.getResponse();
        expect(resp.code).toBe(ErrorCode.AUTH_FORBIDDEN);
      }
    });
  });

  // ─── Large org header ────────────────────────────────────────

  describe('large org header', () => {
    it('sets X-Zephix-Org-Warning when org is large', async () => {
      mockService.isLargeOrg.mockResolvedValue(true);
      const res = mockRes();
      await controller.getSummary(adminReq(), res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Zephix-Org-Warning',
        'Large org aggregation',
      );
    });

    it('does not set header for small org', async () => {
      mockService.isLargeOrg.mockResolvedValue(false);
      const res = mockRes();
      await controller.getSummary(adminReq(), res);
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'X-Zephix-Org-Warning',
        expect.anything(),
      );
    });

    it('sets warning header when DTO has capability warnings', async () => {
      const dtoWithWarnings = new OrgAnalyticsSummaryDto();
      dtoWithWarnings.warnings = ['earned_value_snapshots table not available — EV metrics skipped'];
      mockService.getSummary.mockResolvedValue(dtoWithWarnings);

      const res = mockRes();
      await controller.getSummary(adminReq(), res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Zephix-Org-Warning',
        expect.stringContaining('EV metrics skipped'),
      );
    });
  });

  // ─── Response shape ──────────────────────────────────────────

  describe('response shape', () => {
    it('summary response has correct DTO fields including warnings and lastUpdatedAt', async () => {
      const result = await controller.getSummary(adminReq(), mockRes());
      const data = result.data;
      expect(data).toHaveProperty('workspaceCount');
      expect(data).toHaveProperty('portfolioCount');
      expect(data).toHaveProperty('projectCount');
      expect(data).toHaveProperty('atRiskProjectsCount');
      expect(data).toHaveProperty('evEligibleProjectsCount');
      expect(data).toHaveProperty('aggregateCPI');
      expect(data).toHaveProperty('aggregateSPI');
      expect(data).toHaveProperty('totalBudget');
      expect(data).toHaveProperty('totalActualCost');
      expect(data).toHaveProperty('planCode');
      expect(data).toHaveProperty('planStatus');
      expect(data).toHaveProperty('warnings');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('lastUpdatedAt');
      // lastUpdatedAt is parseable ISO string
      expect(Date.parse(data.lastUpdatedAt)).not.toBeNaN();
    });

    it('capacity response has correct DTO fields', async () => {
      const result = await controller.getCapacity(adminReq(), mockRes());
      const data = result.data;
      expect(data).toHaveProperty('utilizationByWorkspace');
      expect(data).toHaveProperty('topOverallocatedUsers');
      expect(data).toHaveProperty('overallocationDaysTotal');
      expect(data).toHaveProperty('timestamp');
    });

    it('storage response has correct DTO fields', async () => {
      const result = await controller.getStorage(adminReq(), mockRes());
      const data = result.data;
      expect(data).toHaveProperty('totalUsedBytes');
      expect(data).toHaveProperty('totalReservedBytes');
      expect(data).toHaveProperty('maxStorageBytes');
      expect(data).toHaveProperty('percentUsed');
      expect(data).toHaveProperty('storageByWorkspace');
      expect(data).toHaveProperty('topWorkspacesByStorage');
      expect(data).toHaveProperty('timestamp');
    });

    it('scenarios response has correct DTO fields', async () => {
      const result = await controller.getScenarios(adminReq(), mockRes());
      const data = result.data;
      expect(data).toHaveProperty('scenarioCountTotal');
      expect(data).toHaveProperty('scenarioCountLast30Days');
      expect(data).toHaveProperty('computeRunsLast30Days');
      expect(data).toHaveProperty('topScenarioWorkspaces');
      expect(data).toHaveProperty('timestamp');
    });

    it('audit response has correct DTO fields', async () => {
      const result = await controller.getAudit(adminReq(), mockRes());
      const data = result.data;
      expect(data).toHaveProperty('auditEventsLast30Days');
      expect(data).toHaveProperty('auditByAction');
      expect(data).toHaveProperty('auditByWorkspace');
      expect(data).toHaveProperty('timestamp');
    });
  });

  // ─── Service delegation ──────────────────────────────────────

  describe('service delegation', () => {
    it('passes organizationId from auth to service', async () => {
      await controller.getSummary(adminReq('org-specific'), mockRes());
      expect(mockService.getSummary).toHaveBeenCalledWith('org-specific');
    });
  });

  // ─── PlanRateLimit decorator metadata ──────────────────────

  describe('PlanRateLimit decorator metadata', () => {
    const reflector = new Reflector();

    it('getSummary has PlanRateLimit standard', () => {
      const tier = reflector.get<string>(
        PLAN_RATE_LIMIT_KEY,
        OrganizationAnalyticsController.prototype.getSummary,
      );
      expect(tier).toBe('standard');
    });

    it('getCapacity has PlanRateLimit compute', () => {
      const tier = reflector.get<string>(
        PLAN_RATE_LIMIT_KEY,
        OrganizationAnalyticsController.prototype.getCapacity,
      );
      expect(tier).toBe('compute');
    });

    it('getStorage has PlanRateLimit standard', () => {
      const tier = reflector.get<string>(
        PLAN_RATE_LIMIT_KEY,
        OrganizationAnalyticsController.prototype.getStorage,
      );
      expect(tier).toBe('standard');
    });

    it('getScenarios has PlanRateLimit standard', () => {
      const tier = reflector.get<string>(
        PLAN_RATE_LIMIT_KEY,
        OrganizationAnalyticsController.prototype.getScenarios,
      );
      expect(tier).toBe('standard');
    });

    it('getAudit has PlanRateLimit standard', () => {
      const tier = reflector.get<string>(
        PLAN_RATE_LIMIT_KEY,
        OrganizationAnalyticsController.prototype.getAudit,
      );
      expect(tier).toBe('standard');
    });
  });

  // ─── Cross-org isolation ────────────────────────────────────

  describe('cross-org isolation', () => {
    it('org A analytics does not call service with org B id', async () => {
      await controller.getSummary(adminReq('org-A'), mockRes());
      expect(mockService.getSummary).toHaveBeenCalledWith('org-A');
      expect(mockService.getSummary).not.toHaveBeenCalledWith('org-B');
    });

    it('org B request scopes correctly', async () => {
      const orgBReq = { user: { id: 'u1', organizationId: 'org-B', platformRole: 'ADMIN' } } as any;
      await controller.getCapacity(orgBReq, mockRes());
      expect(mockService.getCapacity).toHaveBeenCalledWith('org-B');
      expect(mockService.getCapacity).not.toHaveBeenCalledWith('org-A');
    });
  });
});
