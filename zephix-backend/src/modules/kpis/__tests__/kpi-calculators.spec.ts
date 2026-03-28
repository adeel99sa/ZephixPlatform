import {
  calcWip,
  calcThroughput,
  calcCycleTime,
  calcVelocity,
  calcBudgetBurn,
  calcForecastAtCompletion,
  calcScheduleVariance,
  calcSpi,
  calcChangeRequestCycleTime,
  calcChangeRequestApprovalRate,
  calcOpenRiskCount,
  calcEscapedDefects,
  KPI_ENGINE_VERSION,
  TaskSnapshot,
  IterationSnapshot,
  BudgetSnapshot,
  ProjectCostSnapshot,
  EvSnapshot,
  ChangeRequestSnapshot,
} from '../engine/kpi-calculators';

describe('KPI Calculators', () => {
  // ── Engine version audit ──────────────────────────────────────────────
  describe('engineVersion traceability', () => {
    it('every calculator includes engineVersion in valueJson', () => {
      const now = new Date();
      const results = [
        calcWip([]),
        calcThroughput([]),
        calcCycleTime([]),
        calcVelocity([]),
        calcBudgetBurn(null, null),
        calcForecastAtCompletion(null),
        calcScheduleVariance(null),
        calcSpi(null),
        calcChangeRequestCycleTime([]),
        calcChangeRequestApprovalRate([]),
        calcOpenRiskCount(0),
        calcEscapedDefects(),
      ];
      for (const result of results) {
        expect(result.valueJson).toBeDefined();
        expect(result.valueJson?.engineVersion).toBe(KPI_ENGINE_VERSION);
      }
    });
  });

  // ── WIP ─────────────────────────────────────────────────────────────
  describe('calcWip', () => {
    it('counts tasks with IN_PROGRESS status', () => {
      const tasks: TaskSnapshot[] = [
        { status: 'IN_PROGRESS', actualStartAt: null, completedAt: null, estimatePoints: null },
        { status: 'TODO', actualStartAt: null, completedAt: null, estimatePoints: null },
        { status: 'IN_PROGRESS', actualStartAt: null, completedAt: null, estimatePoints: null },
        { status: 'DONE', actualStartAt: null, completedAt: new Date(), estimatePoints: 3 },
      ];
      const result = calcWip(tasks);
      expect(result.valueNumeric).toBe(2);
      expect(result.sampleSize).toBe(4);
    });

    it('returns 0 when no tasks are in progress', () => {
      const result = calcWip([
        { status: 'TODO', actualStartAt: null, completedAt: null, estimatePoints: null },
      ]);
      expect(result.valueNumeric).toBe(0);
    });

    it('returns 0 for empty task list', () => {
      const result = calcWip([]);
      expect(result.valueNumeric).toBe(0);
      expect(result.sampleSize).toBe(0);
    });
  });

  // ── Throughput ──────────────────────────────────────────────────────
  describe('calcThroughput', () => {
    it('counts tasks completed within rolling window', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 2 * 86_400_000);
      const old = new Date(now.getTime() - 10 * 86_400_000);
      const tasks: TaskSnapshot[] = [
        { status: 'DONE', actualStartAt: null, completedAt: recent, estimatePoints: null },
        { status: 'DONE', actualStartAt: null, completedAt: recent, estimatePoints: null },
        { status: 'DONE', actualStartAt: null, completedAt: old, estimatePoints: null },
      ];
      const result = calcThroughput(tasks, 7);
      expect(result.valueNumeric).toBe(2);
      expect(result.sampleSize).toBe(2);
    });

    it('returns 0 when no tasks completed in window', () => {
      const old = new Date(Date.now() - 30 * 86_400_000);
      const tasks: TaskSnapshot[] = [
        { status: 'DONE', actualStartAt: null, completedAt: old, estimatePoints: null },
      ];
      const result = calcThroughput(tasks, 7);
      expect(result.valueNumeric).toBe(0);
    });

    it('returns 0 for empty list', () => {
      const result = calcThroughput([]);
      expect(result.valueNumeric).toBe(0);
    });
  });

  // ── Cycle Time ──────────────────────────────────────────────────────
  describe('calcCycleTime', () => {
    it('calculates average days from start to completion', () => {
      const now = new Date();
      const completedAt = new Date(now.getTime() - 1 * 86_400_000);
      const startedAt = new Date(completedAt.getTime() - 5 * 86_400_000);
      const tasks: TaskSnapshot[] = [
        { status: 'DONE', actualStartAt: startedAt, completedAt, estimatePoints: null },
      ];
      const result = calcCycleTime(tasks);
      expect(result.valueNumeric).toBeCloseTo(5, 0);
      expect(result.sampleSize).toBe(1);
    });

    it('returns null when no eligible tasks', () => {
      const result = calcCycleTime([]);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });

    it('excludes tasks without actualStartAt', () => {
      const now = new Date();
      const tasks: TaskSnapshot[] = [
        { status: 'DONE', actualStartAt: null, completedAt: now, estimatePoints: null },
      ];
      const result = calcCycleTime(tasks);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });
  });

  // ── Velocity ────────────────────────────────────────────────────────
  describe('calcVelocity', () => {
    it('averages completedPoints across completed iterations', () => {
      const iterations: IterationSnapshot[] = [
        { id: '1', name: 'Sprint 1', status: 'COMPLETED', completedPoints: 20 },
        { id: '2', name: 'Sprint 2', status: 'COMPLETED', completedPoints: 30 },
        { id: '3', name: 'Sprint 3', status: 'ACTIVE', completedPoints: 10 },
      ];
      const result = calcVelocity(iterations);
      expect(result.valueNumeric).toBe(25);
      expect(result.sampleSize).toBe(2);
      expect(result.valueJson).toHaveProperty('sprints');
    });

    it('returns null when no completed iterations', () => {
      const result = calcVelocity([
        { id: '1', name: 'Sprint 1', status: 'PLANNING', completedPoints: null },
      ]);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });

    it('treats null completedPoints as 0', () => {
      const result = calcVelocity([
        { id: '1', name: 'Sprint 1', status: 'COMPLETED', completedPoints: null },
      ]);
      expect(result.valueNumeric).toBe(0);
      expect(result.sampleSize).toBe(1);
    });
  });

  // ── Budget Burn ─────────────────────────────────────────────────────
  describe('calcBudgetBurn', () => {
    it('calculates actual / baseline as percentage', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '100000.00',
        revisedBudget: '110000.00',
        forecastAtCompletion: '105000.00',
      };
      const project: ProjectCostSnapshot = { actualCost: 50000 };
      const result = calcBudgetBurn(budget, project);
      expect(result.valueNumeric).toBe(50);
      expect(result.sampleSize).toBe(1);
    });

    it('returns null when baseline is zero', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '0',
        revisedBudget: '0',
        forecastAtCompletion: '0',
      };
      const result = calcBudgetBurn(budget, { actualCost: 1000 });
      expect(result.valueNumeric).toBeNull();
    });

    it('returns null when budget is missing', () => {
      const result = calcBudgetBurn(null, null);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });

    it('returns null when baseline is negative', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '-5000',
        revisedBudget: '0',
        forecastAtCompletion: '0',
      };
      const result = calcBudgetBurn(budget, { actualCost: 1000 });
      expect(result.valueNumeric).toBeNull();
      expect(result.valueJson?.reason).toBe('baseline_budget_zero');
    });

    it('handles negative actualCost without Infinity', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '100000',
        revisedBudget: '100000',
        forecastAtCompletion: '100000',
      };
      const result = calcBudgetBurn(budget, { actualCost: -5000 });
      expect(result.valueNumeric).toBe(-5);
      expect(Number.isFinite(result.valueNumeric)).toBe(true);
    });

    it('handles null actualCost as 0', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '100000',
        revisedBudget: '100000',
        forecastAtCompletion: '100000',
      };
      const result = calcBudgetBurn(budget, { actualCost: null });
      expect(result.valueNumeric).toBe(0);
    });
  });

  // ── Forecast at Completion ──────────────────────────────────────────
  describe('calcForecastAtCompletion', () => {
    it('returns forecastAtCompletion when available', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '100000',
        revisedBudget: '110000',
        forecastAtCompletion: '120000',
      };
      const result = calcForecastAtCompletion(budget);
      expect(result.valueNumeric).toBe(120000);
      expect(result.valueJson?.source).toBe('forecastAtCompletion');
    });

    it('falls back to revisedBudget', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '100000',
        revisedBudget: '110000',
        forecastAtCompletion: '0',
      };
      const result = calcForecastAtCompletion(budget);
      expect(result.valueNumeric).toBe(110000);
      expect(result.valueJson?.source).toBe('revisedBudget_fallback');
    });

    it('returns null when no budget', () => {
      const result = calcForecastAtCompletion(null);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });

    it('returns null when all budget values are zero', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '0',
        revisedBudget: '0',
        forecastAtCompletion: '0',
      };
      const result = calcForecastAtCompletion(budget);
      expect(result.valueNumeric).toBeNull();
      expect(result.valueJson?.source).toBe('none_available');
    });

    it('handles negative forecastAtCompletion gracefully', () => {
      const budget: BudgetSnapshot = {
        baselineBudget: '100000',
        revisedBudget: '100000',
        forecastAtCompletion: '-5000',
      };
      const result = calcForecastAtCompletion(budget);
      // Negative FAC is not > 0, so falls back
      expect(result.valueNumeric).toBe(100000);
      expect(result.valueJson?.source).toBe('revisedBudget_fallback');
    });
  });

  // ── Schedule Variance ───────────────────────────────────────────────
  describe('calcScheduleVariance', () => {
    it('computes EV minus PV', () => {
      const snapshot: EvSnapshot = { ev: 80000, pv: 100000 };
      const result = calcScheduleVariance(snapshot);
      expect(result.valueNumeric).toBe(-20000);
      expect(result.sampleSize).toBe(1);
    });

    it('returns null when EV data missing', () => {
      const result = calcScheduleVariance(null);
      expect(result.valueNumeric).toBeNull();
    });

    it('returns null when ev is null', () => {
      const result = calcScheduleVariance({ ev: null, pv: 100 });
      expect(result.valueNumeric).toBeNull();
    });

    it('handles negative EV and PV values correctly', () => {
      const result = calcScheduleVariance({ ev: -100, pv: 200 });
      expect(result.valueNumeric).toBe(-300);
      expect(Number.isFinite(result.valueNumeric)).toBe(true);
    });
  });

  // ── SPI ─────────────────────────────────────────────────────────────
  describe('calcSpi', () => {
    it('computes EV / PV', () => {
      const result = calcSpi({ ev: 80, pv: 100 });
      expect(result.valueNumeric).toBe(0.8);
    });

    it('returns null when PV is zero — no Infinity', () => {
      const result = calcSpi({ ev: 80, pv: 0 });
      expect(result.valueNumeric).toBeNull();
      expect(result.valueJson?.reason).toBe('pv_is_zero');
    });

    it('returns null when snapshot is null', () => {
      const result = calcSpi(null);
      expect(result.valueNumeric).toBeNull();
    });

    it('handles negative EV correctly', () => {
      const result = calcSpi({ ev: -50, pv: 100 });
      expect(result.valueNumeric).toBe(-0.5);
      expect(Number.isFinite(result.valueNumeric)).toBe(true);
    });
  });

  // ── Change Request Cycle Time ───────────────────────────────────────
  describe('calcChangeRequestCycleTime', () => {
    it('averages days from creation to approval', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 10 * 86_400_000);
      const approved = new Date(now.getTime() - 3 * 86_400_000);
      const crs: ChangeRequestSnapshot[] = [
        { status: 'APPROVED', createdAt: created, approvedAt: approved },
      ];
      const result = calcChangeRequestCycleTime(crs);
      expect(result.valueNumeric).toBeCloseTo(7, 0);
      expect(result.sampleSize).toBe(1);
    });

    it('returns null when no approved CRs in window', () => {
      const result = calcChangeRequestCycleTime([]);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });
  });

  // ── Change Request Approval Rate ────────────────────────────────────
  describe('calcChangeRequestApprovalRate', () => {
    it('computes approved / total as percentage', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 5 * 86_400_000);
      const crs: ChangeRequestSnapshot[] = [
        { status: 'APPROVED', createdAt: recent, approvedAt: recent },
        { status: 'APPROVED', createdAt: recent, approvedAt: recent },
        { status: 'REJECTED', createdAt: recent, approvedAt: null },
      ];
      const result = calcChangeRequestApprovalRate(crs);
      expect(result.valueNumeric).toBeCloseTo(66.67, 1);
      expect(result.sampleSize).toBe(3);
    });

    it('returns null when no CRs in window', () => {
      const result = calcChangeRequestApprovalRate([]);
      expect(result.valueNumeric).toBeNull();
    });

    it('ignores non-terminal statuses', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 5 * 86_400_000);
      const crs: ChangeRequestSnapshot[] = [
        { status: 'DRAFT', createdAt: recent, approvedAt: null },
        { status: 'SUBMITTED', createdAt: recent, approvedAt: null },
      ];
      const result = calcChangeRequestApprovalRate(crs);
      expect(result.valueNumeric).toBeNull();
      expect(result.sampleSize).toBe(0);
    });
  });

  // ── Open Risk Count ─────────────────────────────────────────────────
  describe('calcOpenRiskCount', () => {
    it('returns the count directly', () => {
      const result = calcOpenRiskCount(7);
      expect(result.valueNumeric).toBe(7);
      expect(result.sampleSize).toBe(1);
    });

    it('returns 0 for zero risks', () => {
      const result = calcOpenRiskCount(0);
      expect(result.valueNumeric).toBe(0);
    });
  });

  // ── Escaped Defects ─────────────────────────────────────────────────
  describe('calcEscapedDefects', () => {
    it('returns null placeholder', () => {
      const result = calcEscapedDefects();
      expect(result.valueNumeric).toBeNull();
      expect(result.valueJson?.status).toBe('not_supported_mvp');
      expect(result.sampleSize).toBe(0);
    });
  });
});
