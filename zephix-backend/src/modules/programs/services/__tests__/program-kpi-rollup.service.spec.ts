import { ProgramKpiRollupService, PROGRAM_ROLLUP_ENGINE_VERSION } from '../program-kpi-rollup.service';
import { NotFoundException } from '@nestjs/common';

describe('ProgramKpiRollupService', () => {
  let service: ProgramKpiRollupService;
  const mockProgramRepo = { findOne: jest.fn() };
  const mockPortfolioRepo = { findOne: jest.fn() };
  const mockProjectRepo = { find: jest.fn() };
  const mockKpiValueRepo = { find: jest.fn() };
  const mockBudgetRepo = { find: jest.fn() };
  const mockCrRepo = { find: jest.fn() };
  const mockRiskRepo = { find: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProgramKpiRollupService(
      mockProgramRepo as any,
      mockPortfolioRepo as any,
      mockProjectRepo as any,
      mockKpiValueRepo as any,
      mockBudgetRepo as any,
      mockCrRepo as any,
      mockRiskRepo as any,
    );
  });

  const orgId = 'org-1';
  const wsId = 'ws-1';
  const progId = 'prog-1';
  const pfId = 'pf-1';

  const makeProgram = (portfolioId?: string) => ({
    id: progId,
    organizationId: orgId,
    workspaceId: wsId,
    portfolioId: portfolioId || null,
    name: 'Test Program',
  });

  const makePortfolio = (flags: Record<string, boolean> = {}) => ({
    id: pfId,
    costTrackingEnabled: flags.costTrackingEnabled ?? true,
    baselinesEnabled: flags.baselinesEnabled ?? true,
    iterationsEnabled: flags.iterationsEnabled ?? false,
    changeManagementEnabled: flags.changeManagementEnabled ?? true,
  });

  function setupEmptyProgram(portfolioId?: string, portfolioFlags?: Record<string, boolean>) {
    mockProgramRepo.findOne.mockResolvedValue(makeProgram(portfolioId));
    if (portfolioId) {
      mockPortfolioRepo.findOne.mockResolvedValue(makePortfolio(portfolioFlags));
    } else {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
    }
    mockProjectRepo.find.mockResolvedValue([]);
    mockKpiValueRepo.find.mockResolvedValue([]);
    mockBudgetRepo.find.mockResolvedValue([]);
    mockCrRepo.find.mockResolvedValue([]);
    mockRiskRepo.find.mockResolvedValue([]);
  }

  describe('computeForProgram', () => {
    it('throws NotFoundException for missing program', async () => {
      mockProgramRepo.findOne.mockResolvedValue(null);
      await expect(
        service.computeForProgram(wsId, progId, orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns result with correct structure', async () => {
      setupEmptyProgram(pfId);
      const result = await service.computeForProgram(wsId, progId, orgId);

      expect(result).toHaveProperty('programId', progId);
      expect(result).toHaveProperty('portfolioId', pfId);
      expect(result).toHaveProperty('engineVersion', PROGRAM_ROLLUP_ENGINE_VERSION);
      expect(result).toHaveProperty('inputHash');
      expect(result.inputHash).toHaveLength(16);
    });

    it('computed array is sorted by kpiCode', async () => {
      setupEmptyProgram(pfId);
      const result = await service.computeForProgram(wsId, progId, orgId);
      const codes = result.computed.map((c) => c.kpiCode);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    it('skipped array is sorted by kpiCode', async () => {
      setupEmptyProgram(pfId, {
        baselinesEnabled: false,
        costTrackingEnabled: false,
        changeManagementEnabled: false,
      });
      const result = await service.computeForProgram(wsId, progId, orgId);
      const codes = result.skipped.map((s) => s.kpiCode);
      const sorted = [...codes].sort();
      expect(codes).toEqual(sorted);
    });

    // ── Governance inheritance from portfolio ────────────────────────────

    it('inherits governance from portfolio and skips when flags disabled', async () => {
      setupEmptyProgram(pfId, { baselinesEnabled: false });
      const result = await service.computeForProgram(wsId, progId, orgId);
      const skippedCodes = result.skipped.map((s) => s.kpiCode);
      expect(skippedCodes).toContain('spi');
      expect(skippedCodes).toContain('schedule_variance');
    });

    it('skips all gated KPIs when program has no portfolio (flags default false)', async () => {
      setupEmptyProgram(undefined);
      const result = await service.computeForProgram(wsId, progId, orgId);
      const skippedCodes = result.skipped.map((s) => s.kpiCode);
      expect(skippedCodes).toContain('spi');
      expect(skippedCodes).toContain('schedule_variance');
      expect(skippedCodes).toContain('budget_burn');
      expect(skippedCodes).toContain('forecast_at_completion');
      expect(skippedCodes).toContain('change_request_approval_rate');
      for (const s of result.skipped) {
        expect(s.reason).toBe('GOVERNANCE_FLAG_DISABLED');
      }
    });

    it('does not skip ungated KPIs when program has no portfolio', async () => {
      setupEmptyProgram(undefined);
      const result = await service.computeForProgram(wsId, progId, orgId);
      const computedCodes = result.computed.map((c) => c.kpiCode);
      expect(computedCodes).toContain('open_risk_count');
      expect(computedCodes).toContain('throughput');
      expect(computedCodes).toContain('wip');
    });

    // ── scope field ─────────────────────────────────────────────────────

    it('includes scope PROGRAM in every computed KPI valueJson', async () => {
      setupEmptyProgram(pfId);
      const result = await service.computeForProgram(wsId, progId, orgId);
      for (const kpi of result.computed) {
        expect(kpi.valueJson.scope).toBe('PROGRAM');
      }
    });

    // ── engineVersion ───────────────────────────────────────────────────

    it('includes engineVersion in every computed KPI valueJson', async () => {
      setupEmptyProgram(pfId);
      const result = await service.computeForProgram(wsId, progId, orgId);
      for (const kpi of result.computed) {
        expect(kpi.valueJson.engineVersion).toBe(PROGRAM_ROLLUP_ENGINE_VERSION);
      }
    });

    // ── inputHash determinism ───────────────────────────────────────────

    it('produces deterministic inputHash for same inputs', async () => {
      setupEmptyProgram(pfId);
      const r1 = await service.computeForProgram(wsId, progId, orgId, '2026-02-10');
      setupEmptyProgram(pfId);
      const r2 = await service.computeForProgram(wsId, progId, orgId, '2026-02-10');
      expect(r1.inputHash).toBe(r2.inputHash);
    });
  });
});
