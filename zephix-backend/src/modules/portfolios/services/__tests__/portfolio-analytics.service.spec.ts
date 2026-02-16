/**
 * Phase 2D: Portfolio Analytics Service Tests
 * Covers: health aggregation, CPI/SPI weighting, risk thresholds,
 * critical path risk, baseline drift, cross-org isolation, access control.
 */
import { PortfolioAnalyticsService, RISK_THRESHOLDS } from '../portfolio-analytics.service';
import { NotFoundException } from '@nestjs/common';

describe('PortfolioAnalyticsService', () => {
  let service: PortfolioAnalyticsService;
  const mockPortfolioRepo = { findOne: jest.fn() };
  const mockPPRepo = { find: jest.fn() };
  const mockProjectRepo = { find: jest.fn() };
  const mockEVSnapshotRepo = { findOne: jest.fn() };
  const mockBaselineRepo = { findOne: jest.fn() };
  const mockBudgetRepo = { find: jest.fn() };
  const mockBaselineService = { compareBaseline: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBudgetRepo.find.mockResolvedValue([]);
    service = new PortfolioAnalyticsService(
      mockPortfolioRepo as any,
      mockPPRepo as any,
      mockProjectRepo as any,
      mockEVSnapshotRepo as any,
      mockBaselineRepo as any,
      mockBudgetRepo as any,
      mockBaselineService as any,
    );
  });

  const orgId = 'org-1';

  // ── Risk Thresholds Config ──────────────────────────────────────────

  describe('RISK_THRESHOLDS', () => {
    it('defines CPI threshold at 0.9', () => {
      expect(RISK_THRESHOLDS.CPI).toBe(0.9);
    });

    it('defines SPI threshold at 0.9', () => {
      expect(RISK_THRESHOLDS.SPI).toBe(0.9);
    });
  });

  // ── getPortfolioHealth ──────────────────────────────────────────────

  describe('getPortfolioHealth', () => {
    it('throws NotFoundException for missing portfolio', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
      await expect(service.getPortfolioHealth('pf-999', orgId))
        .rejects.toThrow(NotFoundException);
    });

    it('returns zero counts for portfolio with no projects', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'Test PF' });
      mockPPRepo.find.mockResolvedValue([]);
      mockProjectRepo.find.mockResolvedValue([]);

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.projectCount).toBe(0);
      expect(result.totalBudget).toBe(0);
      expect(result.totalActualCost).toBe(0);
      expect(result.aggregateCPI).toBeNull();
      expect(result.aggregateSPI).toBeNull();
    });

    it('aggregates total budget and actual cost across projects', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'Test PF' });
      mockPPRepo.find.mockResolvedValue([
        { projectId: 'p1' },
        { projectId: 'p2' },
      ]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'Project 1', budget: 100000, actualCost: 50000 },
        { id: 'p2', name: 'Project 2', budget: 200000, actualCost: 120000 },
      ]);
      mockEVSnapshotRepo.findOne.mockResolvedValue(null);

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.totalBudget).toBe(300000);
      expect(result.totalActualCost).toBe(170000);
      expect(result.projectCount).toBe(2);
    });

    it('computes BAC-weighted CPI and SPI from latest snapshots', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([
        { projectId: 'p1' },
        { projectId: 'p2' },
      ]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'P1', budget: 100000, actualCost: 50000 },
        { id: 'p2', name: 'P2', budget: 200000, actualCost: 120000 },
      ]);
      // P1: BAC=100k, EV=80k, AC=90k, PV=85k → CPI=0.89, SPI=0.94
      // P2: BAC=200k, EV=180k, AC=170k, PV=190k → CPI=1.06, SPI=0.95
      mockEVSnapshotRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.projectId === 'p1') {
          return { bac: 100000, ev: 80000, ac: 90000, pv: 85000, cpi: 0.89, spi: 0.94 };
        }
        if (where.projectId === 'p2') {
          return { bac: 200000, ev: 180000, ac: 170000, pv: 190000, cpi: 1.06, spi: 0.95 };
        }
        return null;
      });

      const result = await service.getPortfolioHealth('pf-1', orgId);
      // Weighted CPI = (80k + 180k) / (90k + 170k) = 260k / 260k = 1.0
      expect(result.aggregateCPI).toBeCloseTo(1.0, 2);
      // Weighted SPI = (80k + 180k) / (85k + 190k) = 260k / 275k ≈ 0.945
      expect(result.aggregateSPI).toBeCloseTo(0.945, 2);
    });

    it('marks project at-risk when CPI < threshold', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'Troubled Project', budget: 100000, actualCost: 80000 },
      ]);
      mockEVSnapshotRepo.findOne.mockResolvedValue({
        bac: 100000, ev: 60000, ac: 80000, pv: 70000,
        cpi: 0.75, spi: 0.86,
      });

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.atRiskProjectsCount).toBe(1);
      expect(result.projects[0].isAtRisk).toBe(true);
      expect(result.projects[0].riskReasons.length).toBeGreaterThan(0);
    });

    it('does NOT mark project at-risk when CPI and SPI above threshold', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'Healthy', budget: 100000, actualCost: 50000 },
      ]);
      mockEVSnapshotRepo.findOne.mockResolvedValue({
        bac: 100000, ev: 90000, ac: 85000, pv: 88000,
        cpi: 1.06, spi: 1.02,
      });

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.atRiskProjectsCount).toBe(0);
      expect(result.projects[0].isAtRisk).toBe(false);
    });

    it('excludes projects without EV snapshot from CPI/SPI weighting but includes in projectCount', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([
        { projectId: 'p1' },
        { projectId: 'p2' },
      ]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'EV Enabled', budget: 100000, actualCost: 50000 },
        { id: 'p2', name: 'No EV', budget: 200000, actualCost: 100000 },
      ]);
      // P1 has EV snapshot with BAC > 0 → eligible
      // P2 has no EV snapshot → not eligible
      mockEVSnapshotRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.projectId === 'p1') {
          return { bac: 100000, ev: 90000, ac: 85000, pv: 88000, cpi: 1.06, spi: 1.02 };
        }
        return null; // p2 has no snapshot
      });

      const result = await service.getPortfolioHealth('pf-1', orgId);
      // Both projects in count
      expect(result.projectCount).toBe(2);
      // Only p1 eligible for EV
      expect(result.evEligibleCount).toBe(1);
      // CPI/SPI computed only from p1
      expect(result.aggregateCPI).toBeCloseTo(90000 / 85000, 2);
      expect(result.aggregateSPI).toBeCloseTo(90000 / 88000, 2);
      // evEligible flag on individual projects
      expect(result.projects[0].evEligible).toBe(true);
      expect(result.projects[1].evEligible).toBe(false);
    });

    it('excludes projects with BAC=0 from CPI/SPI weighting', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'Zero BAC', budget: 0, actualCost: 0 },
      ]);
      // EV snapshot exists but BAC=0
      mockEVSnapshotRepo.findOne.mockResolvedValue({
        bac: 0, ev: 0, ac: 0, pv: 0, cpi: 0, spi: 0,
      });

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.projectCount).toBe(1);
      expect(result.evEligibleCount).toBe(0);
      expect(result.aggregateCPI).toBeNull();
      expect(result.aggregateSPI).toBeNull();
      expect(result.projects[0].evEligible).toBe(false);
    });

    it('scopes queries by organizationId — cross-org isolation', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
      await expect(service.getPortfolioHealth('pf-1', 'org-other'))
        .rejects.toThrow(NotFoundException);

      expect(mockPortfolioRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'pf-1', organizationId: 'org-other' },
      });
    });

    // ── Wave 8F: Budget source of truth ───────────────────────────────

    it('prefers project_budgets baseline_budget over legacy project.budget', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'P1', budget: 50000, actualCost: 10000 },
      ]);
      mockEVSnapshotRepo.findOne.mockResolvedValue(null);
      mockBudgetRepo.find.mockResolvedValue([
        { projectId: 'p1', baselineBudget: '120000' },
      ]);

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.totalBudget).toBe(120000);
    });

    it('falls back to legacy project.budget when no project_budgets entry', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1', name: 'PF' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'P1', budget: 75000, actualCost: 30000 },
      ]);
      mockEVSnapshotRepo.findOne.mockResolvedValue(null);
      mockBudgetRepo.find.mockResolvedValue([]);

      const result = await service.getPortfolioHealth('pf-1', orgId);
      expect(result.totalBudget).toBe(75000);
    });
  });

  // ── getPortfolioCriticalPathRisk ────────────────────────────────────

  describe('getPortfolioCriticalPathRisk', () => {
    it('throws NotFoundException for missing portfolio', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
      await expect(service.getPortfolioCriticalPathRisk('pf-999', orgId))
        .rejects.toThrow(NotFoundException);
    });

    it('returns 0 projectsWithSlip when no baselines exist', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1', name: 'P1' }]);
      mockBaselineRepo.findOne.mockResolvedValue(null);

      const result = await service.getPortfolioCriticalPathRisk('pf-1', orgId);
      expect(result.projectsWithSlip).toBe(0);
    });

    it('counts projects with critical path slip and sorts desc', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1' });
      mockPPRepo.find.mockResolvedValue([
        { projectId: 'p1' },
        { projectId: 'p2' },
      ]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2' },
      ]);
      mockBaselineRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.projectId === 'p1') return { id: 'bl-1' };
        if (where.projectId === 'p2') return { id: 'bl-2' };
        return null;
      });
      mockBaselineService.compareBaseline.mockImplementation((id: string) => {
        if (id === 'bl-1') {
          return {
            projectSummary: { criticalPathSlipMinutes: 120, maxSlipMinutes: 200, countLate: 3 },
          };
        }
        if (id === 'bl-2') {
          return {
            projectSummary: { criticalPathSlipMinutes: 480, maxSlipMinutes: 600, countLate: 5 },
          };
        }
      });

      const result = await service.getPortfolioCriticalPathRisk('pf-1', orgId);
      expect(result.projectsWithSlip).toBe(2);
      // Sorted desc by slip — p2 first
      expect(result.projects[0].projectId).toBe('p2');
      expect(result.projects[0].criticalPathSlipMinutes).toBe(480);
      expect(result.projects[1].projectId).toBe('p1');
    });

    it('excludes projects with zero slip', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1', name: 'P1' }]);
      mockBaselineRepo.findOne.mockResolvedValue({ id: 'bl-1' });
      mockBaselineService.compareBaseline.mockResolvedValue({
        projectSummary: { criticalPathSlipMinutes: 0, maxSlipMinutes: 0, countLate: 0 },
      });

      const result = await service.getPortfolioCriticalPathRisk('pf-1', orgId);
      expect(result.projectsWithSlip).toBe(0);
    });
  });

  // ── getPortfolioBaselineDrift ───────────────────────────────────────

  describe('getPortfolioBaselineDrift', () => {
    it('throws NotFoundException for missing portfolio', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue(null);
      await expect(service.getPortfolioBaselineDrift('pf-999', orgId))
        .rejects.toThrow(NotFoundException);
    });

    it('computes average end variance across projects', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1' });
      mockPPRepo.find.mockResolvedValue([
        { projectId: 'p1' },
        { projectId: 'p2' },
      ]);
      mockProjectRepo.find.mockResolvedValue([
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2' },
      ]);
      mockBaselineRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.projectId === 'p1') return { id: 'bl-1' };
        if (where.projectId === 'p2') return { id: 'bl-2' };
        return null;
      });
      mockBaselineService.compareBaseline.mockImplementation((id: string) => {
        if (id === 'bl-1') {
          return {
            baselineId: 'bl-1', baselineName: 'BL1',
            projectSummary: { countLate: 2, maxSlipMinutes: 120, criticalPathSlipMinutes: 60 },
            items: [
              { endVarianceMinutes: 60 },
              { endVarianceMinutes: 120 },
            ],
          };
        }
        if (id === 'bl-2') {
          return {
            baselineId: 'bl-2', baselineName: 'BL2',
            projectSummary: { countLate: 1, maxSlipMinutes: 240, criticalPathSlipMinutes: 240 },
            items: [
              { endVarianceMinutes: 240 },
            ],
          };
        }
      });

      const result = await service.getPortfolioBaselineDrift('pf-1', orgId);
      expect(result.projectsWithBaseline).toBe(2);
      // P1 avg = (60+120)/2 = 90, P2 avg = 240/1 = 240
      // Portfolio avg = (90 + 240) / 2 = 165
      expect(result.averageEndVarianceMinutes).toBe(165);
    });

    it('returns 0 variance when no baselines exist', async () => {
      mockPortfolioRepo.findOne.mockResolvedValue({ id: 'pf-1' });
      mockPPRepo.find.mockResolvedValue([{ projectId: 'p1' }]);
      mockProjectRepo.find.mockResolvedValue([{ id: 'p1', name: 'P1' }]);
      mockBaselineRepo.findOne.mockResolvedValue(null);

      const result = await service.getPortfolioBaselineDrift('pf-1', orgId);
      expect(result.projectsWithBaseline).toBe(0);
      expect(result.averageEndVarianceMinutes).toBe(0);
    });
  });
});
