import { PortfolioKpiRollupService, PORTFOLIO_ROLLUP_ENGINE_VERSION } from '../portfolio-kpi-rollup.service';
import { NotFoundException } from '@nestjs/common';
import { ChangeRequestStatus } from '../../../change-requests/types/change-request.enums';

// ── Feature flag behavior ─────────────────────────────────────────────
describe('PORTFOLIO_KPI_ROLLUP_ENABLED feature flag', () => {
  const originalEnv = process.env.PORTFOLIO_KPI_ROLLUP_ENABLED;
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PORTFOLIO_KPI_ROLLUP_ENABLED;
    } else {
      process.env.PORTFOLIO_KPI_ROLLUP_ENABLED = originalEnv;
    }
  });

  it('flag defaults to undefined (disabled)', () => {
    delete process.env.PORTFOLIO_KPI_ROLLUP_ENABLED;
    expect(process.env.PORTFOLIO_KPI_ROLLUP_ENABLED).toBeUndefined();
    expect(process.env.PORTFOLIO_KPI_ROLLUP_ENABLED === 'true').toBe(false);
  });

  it('flag enabled when set to true', () => {
    process.env.PORTFOLIO_KPI_ROLLUP_ENABLED = 'true';
    expect(process.env.PORTFOLIO_KPI_ROLLUP_ENABLED === 'true').toBe(true);
  });

  it('flag disabled for any value other than true', () => {
    process.env.PORTFOLIO_KPI_ROLLUP_ENABLED = 'false';
    expect(process.env.PORTFOLIO_KPI_ROLLUP_ENABLED === 'true').toBe(false);
    process.env.PORTFOLIO_KPI_ROLLUP_ENABLED = '1';
    expect(process.env.PORTFOLIO_KPI_ROLLUP_ENABLED === 'true').toBe(false);
  });
});

describe('PortfolioKpiRollupService', () => {
  let service: PortfolioKpiRollupService;
  const mockPortfolioRepo = { findOne: jest.fn() };
  const mockPortfolioProjectRepo = { find: jest.fn() };
  const mockProjectRepo = { find: jest.fn() };
  const mockKpiValueRepo = { find: jest.fn() };
  const mockBudgetRepo = { find: jest.fn() };
  const mockCrRepo = { find: jest.fn() };
  const mockRiskRepo = { find: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PortfolioKpiRollupService(
      mockPortfolioRepo as any,
      mockPortfolioProjectRepo as any,
      mockProjectRepo as any,
      mockKpiValueRepo as any,
      mockBudgetRepo as any,
      mockCrRepo as any,
      mockRiskRepo as any,
    );
  });

  const orgId = 'org-1';
  const wsId = 'ws-1';
  const pfId = 'pf-1';

  const makePortfolio = (flags: Record<string, boolean> = {}) => ({
    id: pfId,
    organizationId: orgId,
    workspaceId: wsId,
    name: 'Test Portfolio',
    costTrackingEnabled: flags.costTrackingEnabled ?? true,
    baselinesEnabled: flags.baselinesEnabled ?? true,
    iterationsEnabled: flags.iterationsEnabled ?? false,
    changeManagementEnabled: flags.changeManagementEnabled ?? true,
  });

  function setupEmptyPortfolio(flags: Record<string, boolean> = {}) {
    mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio(flags));
    mockProjectRepo.find.mockResolvedValue([]);
    mockPortfolioProjectRepo.find.mockResolvedValue([]);
    mockKpiValueRepo.find.mockResolvedValue([]);
    mockBudgetRepo.find.mockResolvedValue([]);
    mockCrRepo.find.mockResolvedValue([]);
    mockRiskRepo.find.mockResolvedValue([]);
  }

  describe('computeForPortfolio', () => {
    it('throws NotFoundException for missing portfolio', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
      await expect(
        service.computeForPortfolio(wsId, pfId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns result with correct structure', async () => {
      setupEmptyPortfolio();
      const result = await service.computeForPortfolio(wsId, pfId, orgId);

      expect(result).toHaveProperty('portfolioId', pfId);
      expect(result).toHaveProperty('engineVersion', PORTFOLIO_ROLLUP_ENGINE_VERSION);
      expect(result).toHaveProperty('inputHash');
      expect(result.inputHash).toHaveLength(16);
      expect(result).toHaveProperty('computed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('sources');
    });

    it('computed array is sorted by kpiCode', async () => {
      setupEmptyPortfolio();
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const codes = result.computed.map((c) => c.kpiCode);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    it('skipped array is sorted by kpiCode', async () => {
      setupEmptyPortfolio({
        baselinesEnabled: false,
        costTrackingEnabled: false,
        changeManagementEnabled: false,
      });
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const codes = result.skipped.map((s) => s.kpiCode);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    // ── Governance gating ───────────────────────────────────────────────

    it('skips spi and schedule_variance when baselinesEnabled=false', async () => {
      setupEmptyPortfolio({ baselinesEnabled: false });
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const skippedCodes = result.skipped.map((s) => s.kpiCode);
      expect(skippedCodes).toContain('spi');
      expect(skippedCodes).toContain('schedule_variance');

      const spiSkip = result.skipped.find((s) => s.kpiCode === 'spi');
      expect(spiSkip?.reason).toBe('GOVERNANCE_FLAG_DISABLED');
      expect(spiSkip?.governanceFlag).toBe('baselinesEnabled');
    });

    it('skips budget_burn and forecast_at_completion when costTrackingEnabled=false', async () => {
      setupEmptyPortfolio({ costTrackingEnabled: false });
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const skippedCodes = result.skipped.map((s) => s.kpiCode);
      expect(skippedCodes).toContain('budget_burn');
      expect(skippedCodes).toContain('forecast_at_completion');
    });

    it('skips change_request_approval_rate when changeManagementEnabled=false', async () => {
      setupEmptyPortfolio({ changeManagementEnabled: false });
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const skippedCodes = result.skipped.map((s) => s.kpiCode);
      expect(skippedCodes).toContain('change_request_approval_rate');
    });

    it('does not skip open_risk_count or throughput or wip regardless of flags', async () => {
      setupEmptyPortfolio({
        baselinesEnabled: false,
        costTrackingEnabled: false,
        changeManagementEnabled: false,
      });
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const skippedCodes = result.skipped.map((s) => s.kpiCode);
      expect(skippedCodes).not.toContain('open_risk_count');
      expect(skippedCodes).not.toContain('throughput');
      expect(skippedCodes).not.toContain('wip');
    });

    // ── NO_DATA handling ────────────────────────────────────────────────

    it('returns NO_DATA status for KPIs with missing data', async () => {
      setupEmptyPortfolio();
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const budgetBurn = result.computed.find((c) => c.kpiCode === 'budget_burn');
      expect(budgetBurn?.status).toBe('NO_DATA');
      expect(budgetBurn?.value).toBeNull();
    });

    // ── Budget computations ─────────────────────────────────────────────

    it('computes budget_burn from project_budgets', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([
        { id: 'b1', projectId: 'p1', workspaceId: wsId, baselineBudget: '100000', revisedBudget: '90000', forecastAtCompletion: '95000' },
        { id: 'b2', projectId: 'p2', workspaceId: wsId, baselineBudget: '200000', revisedBudget: '220000', forecastAtCompletion: '230000' },
      ]);
      mockCrRepo.find.mockResolvedValue([]);
      mockRiskRepo.find.mockResolvedValue([]);

      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const budgetBurn = result.computed.find((c) => c.kpiCode === 'budget_burn');
      expect(budgetBurn).toBeDefined();
      expect(budgetBurn!.value).toBeCloseTo(310000 / 300000, 4);

      const fac = result.computed.find((c) => c.kpiCode === 'forecast_at_completion');
      expect(fac).toBeDefined();
      expect(fac!.value).toBe(325000);
    });

    it('returns null for budget_burn when total baseline is zero (division by zero guard)', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1' }]);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([
        { id: 'b1', projectId: 'p1', workspaceId: wsId, baselineBudget: '0', revisedBudget: '0', forecastAtCompletion: '0' },
      ]);
      mockCrRepo.find.mockResolvedValue([]);
      mockRiskRepo.find.mockResolvedValue([]);

      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const budgetBurn = result.computed.find((c) => c.kpiCode === 'budget_burn');
      expect(budgetBurn?.value).toBeNull();
      expect(budgetBurn?.status).toBe('NO_DATA');
    });

    // ── Change request approval rate ────────────────────────────────────

    it('computes change_request_approval_rate', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1' }]);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([]);
      mockCrRepo.find.mockResolvedValue([
        { id: 'cr1', status: ChangeRequestStatus.APPROVED },
        { id: 'cr2', status: ChangeRequestStatus.APPROVED },
        { id: 'cr3', status: ChangeRequestStatus.REJECTED },
        { id: 'cr4', status: ChangeRequestStatus.SUBMITTED },
      ]);
      mockRiskRepo.find.mockResolvedValue([]);

      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const crRate = result.computed.find((c) => c.kpiCode === 'change_request_approval_rate');
      expect(crRate).toBeDefined();
      expect(crRate!.value).toBeCloseTo(2 / 3, 4);
    });

    // ── Risk count ──────────────────────────────────────────────────────

    it('computes open_risk_count', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1' }]);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([]);
      mockCrRepo.find.mockResolvedValue([]);
      mockRiskRepo.find.mockResolvedValue([
        { id: 'r1' }, { id: 'r2' }, { id: 'r3' },
      ]);

      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const risks = result.computed.find((c) => c.kpiCode === 'open_risk_count');
      expect(risks?.value).toBe(3);
      expect(risks?.status).toBe('OK');
    });

    // ── engineVersion and inputHash ─────────────────────────────────────

    it('includes engineVersion in every computed KPI valueJson', async () => {
      setupEmptyPortfolio();
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      for (const kpi of result.computed) {
        expect(kpi.valueJson.engineVersion).toBe(PORTFOLIO_ROLLUP_ENGINE_VERSION);
      }
    });

    it('includes scope PORTFOLIO in every computed KPI valueJson', async () => {
      setupEmptyPortfolio();
      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      for (const kpi of result.computed) {
        expect(kpi.valueJson.scope).toBe('PORTFOLIO');
      }
    });

    it('produces deterministic inputHash for same inputs', async () => {
      setupEmptyPortfolio();
      const r1 = await service.computeForPortfolio(wsId, pfId, orgId, '2026-02-10');
      setupEmptyPortfolio();
      const r2 = await service.computeForPortfolio(wsId, pfId, orgId, '2026-02-10');
      expect(r1.inputHash).toBe(r2.inputHash);
    });

    // ── Sources ─────────────────────────────────────────────────────────

    it('reports correct sources counts', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([
        { id: 'b1', projectId: 'p1', workspaceId: wsId, baselineBudget: '100' },
      ]);
      mockCrRepo.find.mockResolvedValue([]);
      mockRiskRepo.find.mockResolvedValue([]);

      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      expect(result.sources.projectCount).toBe(2);
      expect(result.sources.budgetsFound).toBe(1);
    });

    // ── Determinism: sorted inputs produce stable hash ──────────────────

    it('inputHash is stable regardless of project insertion order', async () => {
      const setupWithProjects = (ids: string[]) => {
        mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
        mockProjectRepo.find.mockResolvedValue(ids.map((id) => ({ id })));
        mockPortfolioProjectRepo.find.mockResolvedValue([]);
        mockKpiValueRepo.find.mockResolvedValue([]);
        mockBudgetRepo.find.mockResolvedValue(
          ids.map((id) => ({ id: `b-${id}`, projectId: id, workspaceId: wsId, baselineBudget: '100', revisedBudget: '100', forecastAtCompletion: '100' })),
        );
        mockCrRepo.find.mockResolvedValue([]);
        mockRiskRepo.find.mockResolvedValue([]);
      };

      setupWithProjects(['p-alpha', 'p-beta', 'p-gamma']);
      const r1 = await service.computeForPortfolio(wsId, pfId, orgId, '2026-02-10');
      setupWithProjects(['p-gamma', 'p-alpha', 'p-beta']);
      const r2 = await service.computeForPortfolio(wsId, pfId, orgId, '2026-02-10');
      expect(r1.inputHash).toBe(r2.inputHash);
    });

    // ── Budget burn WARNING status on overburn ───────────────────────────

    it('budget_burn returns WARNING when revised exceeds baseline', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1' }]);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([
        { id: 'b1', projectId: 'p1', workspaceId: wsId, baselineBudget: '100000', revisedBudget: '120000', forecastAtCompletion: '130000' },
      ]);
      mockCrRepo.find.mockResolvedValue([]);
      mockRiskRepo.find.mockResolvedValue([]);

      const result = await service.computeForPortfolio(wsId, pfId, orgId);
      const burn = result.computed.find((c) => c.kpiCode === 'budget_burn');
      expect(burn?.status).toBe('WARNING');
      expect(burn!.value).toBeGreaterThan(1.0);
    });

    // ── N+1 query prevention (bounded calls) ────────────────────────────

    it('makes bounded repository calls regardless of project count', async () => {
      const manyProjects = Array.from({ length: 20 }, (_, i) => ({ id: `p-${i}` }));
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio());
      mockProjectRepo.find.mockResolvedValue(manyProjects);
      mockPortfolioProjectRepo.find.mockResolvedValue([]);
      mockKpiValueRepo.find.mockResolvedValue([]);
      mockBudgetRepo.find.mockResolvedValue([]);
      mockCrRepo.find.mockResolvedValue([]);
      mockRiskRepo.find.mockResolvedValue([]);

      await service.computeForPortfolio(wsId, pfId, orgId);

      expect(mockPortfolioRepo.findOne).toHaveBeenCalledTimes(1);
      expect(mockProjectRepo.find).toHaveBeenCalledTimes(1);
      expect(mockPortfolioProjectRepo.find).toHaveBeenCalledTimes(1);
      expect(mockKpiValueRepo.find).toHaveBeenCalledTimes(1);
      expect(mockBudgetRepo.find).toHaveBeenCalledTimes(1);
      expect(mockCrRepo.find).toHaveBeenCalledTimes(1);
      expect(mockRiskRepo.find).toHaveBeenCalledTimes(1);
    });

    // ── Workspace scoping ───────────────────────────────────────────────

    it('portfolio not found returns NotFoundException (workspace mismatch)', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
      await expect(
        service.computeForPortfolio('wrong-ws', pfId, orgId),
      ).rejects.toThrow(NotFoundException);

      expect(mockPortfolioRepo.findOne).toHaveBeenCalledWith({
        where: { id: pfId, organizationId: orgId, workspaceId: 'wrong-ws' },
      });
    });
  });
});
