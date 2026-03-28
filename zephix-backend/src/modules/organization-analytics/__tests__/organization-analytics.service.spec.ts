/**
 * Phase 4A: OrganizationAnalyticsService Tests
 *
 * Covers: summary, capacity, storage, scenarios, audit aggregation.
 * Verifies org scoping, math correctness, empty states, performance flags,
 * capability gating (table existence), and structured warnings.
 */
import { OrganizationAnalyticsService } from '../services/organization-analytics.service';

const ORG_ID = 'org-test-1';
const OTHER_ORG_ID = 'org-test-2';

/** Helper: builds a pg_tables response showing all optional tables present */
function allTablesPresent() {
  return [
    { tablename: 'earned_value_snapshots' },
    { tablename: 'workspace_member_capacity' },
    { tablename: 'workspace_storage_usage' },
    { tablename: 'scenario_plans' },
    { tablename: 'scenario_results' },
    { tablename: 'audit_events' },
  ];
}

/** Helper: builds a pg_tables response with specific tables missing */
function tablesPresent(names: string[]) {
  return names.map((n) => ({ tablename: n }));
}

describe('OrganizationAnalyticsService', () => {
  let service: OrganizationAnalyticsService;
  let mockDs: any;
  let mockEntitlementService: any;

  beforeEach(() => {
    mockDs = {
      query: jest.fn().mockResolvedValue([]),
    };
    mockEntitlementService = {
      getPlanCode: jest.fn().mockResolvedValue('enterprise'),
      getPlanStatus: jest.fn().mockResolvedValue('active'),
      getLimit: jest.fn().mockResolvedValue(null),
    };
    service = new OrganizationAnalyticsService(mockDs, mockEntitlementService);
  });

  // ─── Capability check ───────────────────────────────────────

  describe('ensureCapabilities', () => {
    it('queries pg_tables for optional tables', async () => {
      mockDs.query.mockResolvedValueOnce(allTablesPresent());
      const caps = await service.ensureCapabilities();
      expect(caps.get('earned_value_snapshots')).toBe(true);
      expect(caps.get('audit_events')).toBe(true);
    });

    it('marks missing tables as false', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent(['audit_events']));
      const caps = await service.ensureCapabilities();
      expect(caps.get('earned_value_snapshots')).toBe(false);
      expect(caps.get('audit_events')).toBe(true);
    });

    it('caches result within TTL window', async () => {
      mockDs.query.mockResolvedValueOnce(allTablesPresent());
      await service.ensureCapabilities();
      await service.ensureCapabilities();
      // Only 1 pg_tables query — cache hit
      expect(mockDs.query).toHaveBeenCalledTimes(1);
    });

    it('refreshes cache after TTL expires', async () => {
      mockDs.query.mockResolvedValueOnce(allTablesPresent());
      await service.ensureCapabilities();

      // Simulate TTL expiry by resetting cache
      service.resetCapabilityCache();

      mockDs.query.mockResolvedValueOnce(allTablesPresent());
      await service.ensureCapabilities();

      // 2 pg_tables queries — one before TTL, one after reset
      expect(mockDs.query).toHaveBeenCalledTimes(2);
    });

    it('marks all tables false when capability check itself fails', async () => {
      mockDs.query.mockRejectedValueOnce(new Error('pg_tables unavailable'));
      const caps = await service.ensureCapabilities();
      expect(caps.get('earned_value_snapshots')).toBe(false);
      expect(caps.get('scenario_plans')).toBe(false);
    });

    it('resetCapabilityCache forces fresh check on next call', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent([]));
      await service.ensureCapabilities();

      service.resetCapabilityCache();

      mockDs.query.mockResolvedValueOnce(allTablesPresent());
      const caps = await service.ensureCapabilities();
      expect(caps.get('earned_value_snapshots')).toBe(true);
    });
  });

  // ─── A. Summary ──────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns zeros when org has no workspaces or projects', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent()) // capability
        .mockResolvedValueOnce([{ workspace_count: 0, portfolio_count: 0, project_count: 0 }])
        .mockResolvedValueOnce([{ ev_eligible: 0, at_risk: 0, weighted_cpi: null, weighted_spi: null, total_budget: '0', total_actual_cost: '0' }]);

      const result = await service.getSummary(ORG_ID);

      expect(result.workspaceCount).toBe(0);
      expect(result.portfolioCount).toBe(0);
      expect(result.projectCount).toBe(0);
      expect(result.atRiskProjectsCount).toBe(0);
      expect(result.evEligibleProjectsCount).toBe(0);
      expect(result.aggregateCPI).toBeNull();
      expect(result.aggregateSPI).toBeNull();
      expect(result.warnings).toEqual([]);
    });

    it('returns correct counts from basic query', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 5, portfolio_count: 3, project_count: 50 }])
        .mockResolvedValueOnce([{ ev_eligible: 10, at_risk: 3, weighted_cpi: '0.9500', weighted_spi: '1.0200', total_budget: '500000', total_actual_cost: '300000' }]);

      const result = await service.getSummary(ORG_ID);

      expect(result.workspaceCount).toBe(5);
      expect(result.portfolioCount).toBe(3);
      expect(result.projectCount).toBe(50);
      expect(result.evEligibleProjectsCount).toBe(10);
      expect(result.atRiskProjectsCount).toBe(3);
      expect(result.aggregateCPI).toBe(0.95);
      expect(result.aggregateSPI).toBe(1.02);
      expect(result.totalBudget).toBe(500000);
      expect(result.totalActualCost).toBe(300000);
    });

    it('includes planCode and planStatus from entitlements', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 0, portfolio_count: 0, project_count: 0 }])
        .mockResolvedValueOnce([]);

      mockEntitlementService.getPlanCode.mockResolvedValue('team');
      mockEntitlementService.getPlanStatus.mockResolvedValue('past_due');

      const result = await service.getSummary(ORG_ID);
      expect(result.planCode).toBe('team');
      expect(result.planStatus).toBe('past_due');
    });

    it('returns warning when EV table is not available', async () => {
      // capability check: EV table missing
      mockDs.query
        .mockResolvedValueOnce(tablesPresent(['workspace_member_capacity', 'workspace_storage_usage', 'scenario_plans', 'scenario_results', 'audit_events']))
        .mockResolvedValueOnce([{ workspace_count: 2, portfolio_count: 0, project_count: 5 }]);

      const result = await service.getSummary(ORG_ID);
      expect(result.workspaceCount).toBe(2);
      expect(result.evEligibleProjectsCount).toBe(0);
      expect(result.aggregateCPI).toBeNull();
      expect(result.warnings).toContain('earned_value_snapshots table not available — EV metrics skipped');
    });

    it('propagates EV query error when table exists', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 2, portfolio_count: 0, project_count: 5 }])
        .mockRejectedValueOnce(new Error('syntax error'));

      await expect(service.getSummary(ORG_ID)).rejects.toThrow('syntax error');
    });

    it('includes timestamp in response', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 0, portfolio_count: 0, project_count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.getSummary(ORG_ID);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });

    it('passes organizationId to all queries (scoping proof)', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 0, portfolio_count: 0, project_count: 0 }])
        .mockResolvedValueOnce([]);

      await service.getSummary(ORG_ID);

      // Skip first call (pg_tables capability check)
      for (let i = 1; i < mockDs.query.mock.calls.length; i++) {
        const call = mockDs.query.mock.calls[i];
        if (call[1]) {
          expect(call[1]).toContain(ORG_ID);
        }
      }
    });
  });

  // ─── B. Capacity ─────────────────────────────────────────────

  describe('getCapacity', () => {
    it('returns warning when capacity table is not available', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent([]));

      const result = await service.getCapacity(ORG_ID);
      expect(result.utilizationByWorkspace).toEqual([]);
      expect(result.topOverallocatedUsers).toEqual([]);
      expect(result.overallocationDaysTotal).toBe(0);
      expect(result.warnings).toContain('workspace_member_capacity table not available — capacity metrics skipped');
    });

    it('returns empty arrays when capacity table exists but no data', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([])  // weekly util
        .mockResolvedValueOnce([]); // overallocated

      const result = await service.getCapacity(ORG_ID);
      expect(result.utilizationByWorkspace).toEqual([]);
      expect(result.topOverallocatedUsers).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('computes overallocationDaysTotal from user entries', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { user_id: 'u1', workspace_id: 'ws1', overallocated_days: 5, peak_utilization: 1.5 },
          { user_id: 'u2', workspace_id: 'ws1', overallocated_days: 3, peak_utilization: 1.2 },
        ]);

      const result = await service.getCapacity(ORG_ID);
      expect(result.topOverallocatedUsers).toHaveLength(2);
      expect(result.overallocationDaysTotal).toBe(8);
    });

    it('includes timestamp', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent([]));
      const result = await service.getCapacity(ORG_ID);
      expect(result.timestamp).toBeDefined();
    });

    it('propagates query error when capacity table exists', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockRejectedValueOnce(new Error('connection lost'));

      await expect(service.getCapacity(ORG_ID)).rejects.toThrow('connection lost');
    });
  });

  // ─── C. Storage ──────────────────────────────────────────────

  describe('getStorage', () => {
    it('returns warning when storage table is not available', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent([]));

      const result = await service.getStorage(ORG_ID);
      expect(result.totalUsedBytes).toBe(0);
      expect(result.totalReservedBytes).toBe(0);
      expect(result.storageByWorkspace).toEqual([]);
      expect(result.warnings).toContain('workspace_storage_usage table not available — storage metrics skipped');
    });

    it('returns zeros when storage table exists but empty', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([]);

      const result = await service.getStorage(ORG_ID);
      expect(result.totalUsedBytes).toBe(0);
      expect(result.warnings).toEqual([]);
    });

    it('computes percentUsed correctly', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([
          { workspace_id: 'ws1', used_bytes: '500000', reserved_bytes: '50000' },
          { workspace_id: 'ws2', used_bytes: '300000', reserved_bytes: '20000' },
        ]);
      mockEntitlementService.getLimit.mockResolvedValue(1000000);

      const result = await service.getStorage(ORG_ID);
      expect(result.totalUsedBytes).toBe(800000);
      expect(result.totalReservedBytes).toBe(70000);
      expect(result.maxStorageBytes).toBe(1000000);
      expect(result.percentUsed).toBe(80);
    });

    it('returns 0 percentUsed when limit is null (unlimited)', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([
          { workspace_id: 'ws1', used_bytes: '500000', reserved_bytes: '0' },
        ]);
      mockEntitlementService.getLimit.mockResolvedValue(null);

      const result = await service.getStorage(ORG_ID);
      expect(result.percentUsed).toBe(0);
    });

    it('returns top 10 workspaces sorted by usedBytes desc', async () => {
      const wsRows = Array.from({ length: 15 }, (_, i) => ({
        workspace_id: `ws-${i}`,
        used_bytes: String((15 - i) * 1000),
        reserved_bytes: '0',
      }));
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce(wsRows);
      mockEntitlementService.getLimit.mockResolvedValue(null);

      const result = await service.getStorage(ORG_ID);
      expect(result.topWorkspacesByStorage).toHaveLength(10);
      expect(result.topWorkspacesByStorage[0].workspaceId).toBe('ws-0');
    });

    it('includes limitBytes from entitlements in each workspace entry', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([
          { workspace_id: 'ws1', used_bytes: '100', reserved_bytes: '0' },
        ]);
      mockEntitlementService.getLimit.mockResolvedValue(5000);

      const result = await service.getStorage(ORG_ID);
      expect(result.storageByWorkspace[0].limitBytes).toBe(5000);
    });

    it('propagates query error when storage table exists', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockRejectedValueOnce(new Error('timeout'));

      await expect(service.getStorage(ORG_ID)).rejects.toThrow('timeout');
    });
  });

  // ─── D. Scenarios ────────────────────────────────────────────

  describe('getScenarios', () => {
    it('returns warning when scenario_plans table is not available', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent([]));

      const result = await service.getScenarios(ORG_ID);
      expect(result.scenarioCountTotal).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('scenario_plans');
    });

    it('returns correct total count when tables available', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ cnt: 25 }])   // total
        .mockResolvedValueOnce([{ cnt: 5 }])    // last 30
        .mockResolvedValueOnce([])               // top ws
        .mockResolvedValueOnce([{ cnt: 12 }]);   // compute runs

      const result = await service.getScenarios(ORG_ID);
      expect(result.scenarioCountTotal).toBe(25);
      expect(result.scenarioCountLast30Days).toBe(5);
      expect(result.computeRunsLast30Days).toBe(12);
      expect(result.warnings).toEqual([]);
    });

    it('skips compute runs when scenario_results missing but scenario_plans present', async () => {
      mockDs.query
        .mockResolvedValueOnce(tablesPresent(['scenario_plans']))
        .mockResolvedValueOnce([{ cnt: 10 }])
        .mockResolvedValueOnce([{ cnt: 2 }])
        .mockResolvedValueOnce([]);

      const result = await service.getScenarios(ORG_ID);
      expect(result.scenarioCountTotal).toBe(10);
      expect(result.computeRunsLast30Days).toBe(0);
      expect(result.warnings).toContain('scenario_results table not available — compute run metrics skipped');
    });

    it('returns top scenario workspaces sorted by count desc', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ cnt: 10 }])
        .mockResolvedValueOnce([{ cnt: 2 }])
        .mockResolvedValueOnce([
          { workspace_id: 'ws-a', scenario_count: 5 },
          { workspace_id: 'ws-b', scenario_count: 3 },
        ])
        .mockResolvedValueOnce([{ cnt: 0 }]);

      const result = await service.getScenarios(ORG_ID);
      expect(result.topScenarioWorkspaces).toHaveLength(2);
      expect(result.topScenarioWorkspaces[0].scenarioCount).toBe(5);
    });

    it('propagates query error when scenario table exists', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockRejectedValueOnce(new Error('deadlock'));

      await expect(service.getScenarios(ORG_ID)).rejects.toThrow('deadlock');
    });
  });

  // ─── E. Audit ────────────────────────────────────────────────

  describe('getAuditSummary', () => {
    it('returns warning when audit_events table is not available', async () => {
      mockDs.query.mockResolvedValueOnce(tablesPresent([]));

      const result = await service.getAuditSummary(ORG_ID);
      expect(result.auditEventsLast30Days).toBe(0);
      expect(result.auditByAction).toEqual([]);
      expect(result.auditByWorkspace).toEqual([]);
      expect(result.warnings).toContain('audit_events table not available — audit metrics skipped');
    });

    it('returns zeros when audit table exists but no events', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAuditSummary(ORG_ID);
      expect(result.auditEventsLast30Days).toBe(0);
      expect(result.warnings).toEqual([]);
    });

    it('returns counts and breakdowns', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ cnt: 150 }])
        .mockResolvedValueOnce([
          { action: 'create', count: 50 },
          { action: 'update', count: 40 },
        ])
        .mockResolvedValueOnce([
          { workspace_id: 'ws-1', count: 80 },
          { workspace_id: 'ws-2', count: 70 },
        ]);

      const result = await service.getAuditSummary(ORG_ID);
      expect(result.auditEventsLast30Days).toBe(150);
      expect(result.auditByAction).toHaveLength(2);
      expect(result.auditByAction[0].action).toBe('create');
      expect(result.auditByWorkspace).toHaveLength(2);
    });

    it('propagates query error when audit table exists', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockRejectedValueOnce(new Error('permission denied'));

      await expect(service.getAuditSummary(ORG_ID)).rejects.toThrow('permission denied');
    });
  });

  // ─── Performance check ───────────────────────────────────────

  describe('isLargeOrg', () => {
    it('returns true when workspaces > 25', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 30, portfolio_count: 0, project_count: 10 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(true);
    });

    it('returns true when projects > 500', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 5, portfolio_count: 0, project_count: 600 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(true);
    });

    it('returns false for small org', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 5, portfolio_count: 2, project_count: 20 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(false);
    });

    it('returns false at exact workspace threshold (25)', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 25, portfolio_count: 0, project_count: 100 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(false);
    });

    it('returns false at exact project threshold (500)', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 10, portfolio_count: 0, project_count: 500 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(false);
    });

    it('returns true at workspace threshold + 1 (26)', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 26, portfolio_count: 0, project_count: 0 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(true);
    });

    it('returns true at project threshold + 1 (501)', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 0, portfolio_count: 0, project_count: 501 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(true);
    });

    it('high portfolios alone does not trigger large org', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 1, portfolio_count: 999, project_count: 1 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(false);
    });

    it('returns false when all counts are zero', async () => {
      mockDs.query.mockResolvedValueOnce([
        { workspace_count: 0, portfolio_count: 0, project_count: 0 },
      ]);
      expect(await service.isLargeOrg(ORG_ID)).toBe(false);
    });
  });

  // ─── Org isolation ───────────────────────────────────────────

  describe('org isolation', () => {
    it('never passes wrong orgId to queries (summary)', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 0, portfolio_count: 0, project_count: 0 }])
        .mockResolvedValueOnce([]);

      await service.getSummary(ORG_ID);

      // Skip first call (pg_tables capability check)
      for (let i = 1; i < mockDs.query.mock.calls.length; i++) {
        const call = mockDs.query.mock.calls[i];
        if (call[1]) {
          expect(call[1]).not.toContain(OTHER_ORG_ID);
          expect(call[1][0]).toBe(ORG_ID);
        }
      }
    });

    it('scopes storage queries by orgId', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([]);
      mockEntitlementService.getLimit.mockResolvedValue(null);

      await service.getStorage(ORG_ID);

      // Skip capability check
      for (let i = 1; i < mockDs.query.mock.calls.length; i++) {
        const call = mockDs.query.mock.calls[i];
        if (call[1]) {
          expect(call[1][0]).toBe(ORG_ID);
        }
      }
    });

    it('scopes audit queries by orgId', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ cnt: 0 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getAuditSummary(ORG_ID);

      for (let i = 1; i < mockDs.query.mock.calls.length; i++) {
        const call = mockDs.query.mock.calls[i];
        if (call[1]) {
          expect(call[1][0]).toBe(ORG_ID);
        }
      }
    });

    it('org A cannot see org B data (cross-org negative test)', async () => {
      mockDs.query
        .mockResolvedValueOnce(allTablesPresent())
        .mockResolvedValueOnce([{ workspace_count: 10, portfolio_count: 5, project_count: 100 }])
        .mockResolvedValueOnce([{ ev_eligible: 3, at_risk: 1, weighted_cpi: '1.0', weighted_spi: '1.0', total_budget: '1000', total_actual_cost: '500' }]);

      await service.getSummary(ORG_ID);

      // Every parameterized query must pass ORG_ID, never OTHER_ORG_ID
      for (let i = 1; i < mockDs.query.mock.calls.length; i++) {
        const params = mockDs.query.mock.calls[i][1];
        if (params) {
          for (const p of params) {
            expect(p).not.toBe(OTHER_ORG_ID);
          }
        }
      }
    });
  });
});
