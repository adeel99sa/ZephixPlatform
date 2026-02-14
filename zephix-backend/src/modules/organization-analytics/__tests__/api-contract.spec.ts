/**
 * Phase 4D: Organization Analytics API Contract Tests
 *
 * Validates the shape of all 5 endpoint responses in a single suite.
 * Covers: required fields, warnings default, lastUpdatedAt, timestamp,
 * header behavior for large orgs and capability warnings.
 *
 * These tests prevent silent shape drift across releases.
 */
import { OrganizationAnalyticsController } from '../controllers/organization-analytics.controller';
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

describe('Organization Analytics — API contract', () => {
  let controller: OrganizationAnalyticsController;
  let mockService: any;

  const adminReq = () =>
    ({ user: { id: 'u1', organizationId: 'org-1', platformRole: 'ADMIN' } }) as any;

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

  // ─── Summary contract ──────────────────────────────────────

  describe('GET /org/analytics/summary', () => {
    it('returns all required fields', async () => {
      const { data } = await controller.getSummary(adminReq(), mockRes());
      const required = [
        'workspaceCount', 'portfolioCount', 'projectCount',
        'atRiskProjectsCount', 'evEligibleProjectsCount',
        'aggregateCPI', 'aggregateSPI',
        'totalBudget', 'totalActualCost',
        'planCode', 'planStatus',
        'warnings', 'timestamp', 'lastUpdatedAt',
      ];
      for (const field of required) {
        expect(data).toHaveProperty(field);
      }
    });

    it('warnings defaults to empty array', async () => {
      const { data } = await controller.getSummary(adminReq(), mockRes());
      expect(Array.isArray(data.warnings)).toBe(true);
      expect(data.warnings.length).toBe(0);
    });

    it('lastUpdatedAt is parseable ISO string', async () => {
      const { data } = await controller.getSummary(adminReq(), mockRes());
      expect(data.lastUpdatedAt).toBeTruthy();
      expect(Number.isNaN(Date.parse(data.lastUpdatedAt))).toBe(false);
    });

    it('timestamp is parseable ISO string', async () => {
      const { data } = await controller.getSummary(adminReq(), mockRes());
      expect(data.timestamp).toBeTruthy();
      expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false);
    });
  });

  // ─── Capacity contract ─────────────────────────────────────

  describe('GET /org/analytics/capacity', () => {
    it('returns all required fields', async () => {
      const { data } = await controller.getCapacity(adminReq(), mockRes());
      const required = [
        'utilizationByWorkspace', 'topOverallocatedUsers',
        'overallocationDaysTotal', 'warnings', 'timestamp',
      ];
      for (const field of required) {
        expect(data).toHaveProperty(field);
      }
    });

    it('warnings defaults to empty array', async () => {
      const { data } = await controller.getCapacity(adminReq(), mockRes());
      expect(Array.isArray(data.warnings)).toBe(true);
    });

    it('arrays default to empty, not null', async () => {
      const { data } = await controller.getCapacity(adminReq(), mockRes());
      expect(Array.isArray(data.utilizationByWorkspace)).toBe(true);
      expect(Array.isArray(data.topOverallocatedUsers)).toBe(true);
    });
  });

  // ─── Storage contract ──────────────────────────────────────

  describe('GET /org/analytics/storage', () => {
    it('returns all required fields', async () => {
      const { data } = await controller.getStorage(adminReq(), mockRes());
      const required = [
        'totalUsedBytes', 'totalReservedBytes', 'maxStorageBytes',
        'percentUsed', 'storageByWorkspace', 'topWorkspacesByStorage',
        'warnings', 'timestamp',
      ];
      for (const field of required) {
        expect(data).toHaveProperty(field);
      }
    });

    it('warnings defaults to empty array', async () => {
      const { data } = await controller.getStorage(adminReq(), mockRes());
      expect(Array.isArray(data.warnings)).toBe(true);
    });
  });

  // ─── Scenarios contract ────────────────────────────────────

  describe('GET /org/analytics/scenarios', () => {
    it('returns all required fields', async () => {
      const { data } = await controller.getScenarios(adminReq(), mockRes());
      const required = [
        'scenarioCountTotal', 'scenarioCountLast30Days',
        'computeRunsLast30Days', 'topScenarioWorkspaces',
        'warnings', 'timestamp',
      ];
      for (const field of required) {
        expect(data).toHaveProperty(field);
      }
    });

    it('warnings defaults to empty array', async () => {
      const { data } = await controller.getScenarios(adminReq(), mockRes());
      expect(Array.isArray(data.warnings)).toBe(true);
    });
  });

  // ─── Audit contract ────────────────────────────────────────

  describe('GET /org/analytics/audit', () => {
    it('returns all required fields', async () => {
      const { data } = await controller.getAudit(adminReq(), mockRes());
      const required = [
        'auditEventsLast30Days', 'auditByAction', 'auditByWorkspace',
        'warnings', 'timestamp',
      ];
      for (const field of required) {
        expect(data).toHaveProperty(field);
      }
    });

    it('warnings defaults to empty array', async () => {
      const { data } = await controller.getAudit(adminReq(), mockRes());
      expect(Array.isArray(data.warnings)).toBe(true);
    });
  });

  // ─── Header behavior ──────────────────────────────────────

  describe('X-Zephix-Org-Warning header', () => {
    it('set when isLargeOrg returns true', async () => {
      mockService.isLargeOrg.mockResolvedValue(true);
      const res = mockRes();
      await controller.getSummary(adminReq(), res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Zephix-Org-Warning',
        'Large org aggregation',
      );
    });

    it('not set when isLargeOrg returns false and no warnings', async () => {
      mockService.isLargeOrg.mockResolvedValue(false);
      const res = mockRes();
      await controller.getSummary(adminReq(), res);
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'X-Zephix-Org-Warning',
        expect.anything(),
      );
    });

    it('set with capability warnings from DTO', async () => {
      const dtoWithWarns = new OrgAnalyticsSummaryDto();
      dtoWithWarns.warnings = ['table_x not available'];
      mockService.getSummary.mockResolvedValue(dtoWithWarns);

      const res = mockRes();
      await controller.getSummary(adminReq(), res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Zephix-Org-Warning',
        expect.stringContaining('table_x not available'),
      );
    });

    it('header name is stable across all 5 endpoints', async () => {
      mockService.isLargeOrg.mockResolvedValue(true);

      for (const method of ['getSummary', 'getCapacity', 'getStorage', 'getScenarios', 'getAudit'] as const) {
        const res = mockRes();
        await (controller as any)[method](adminReq(), res);
        const headerCall = res.setHeader.mock.calls.find(
          (c: any[]) => c[0] === 'X-Zephix-Org-Warning',
        );
        expect(headerCall).toBeDefined();
        expect(headerCall![0]).toBe('X-Zephix-Org-Warning');
      }
    });
  });
});
