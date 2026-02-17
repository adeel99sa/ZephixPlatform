/**
 * Wave 4A: Pure KPI Calculator Functions
 *
 * Each calculator takes typed inputs and returns a KpiComputeResult.
 * No database access — data is fetched by the compute service and passed in.
 *
 * Every result includes engineVersion in valueJson for audit traceability
 * (PMBOK governance principle: auditable performance measurement).
 */

export const KPI_ENGINE_VERSION = '1.0.0';

export interface KpiComputeResult {
  valueNumeric: number | null;
  valueText: string | null;
  valueJson: Record<string, any> | null;
  sampleSize: number;
}

/** Wraps valueJson with engineVersion metadata. */
function withMeta(json: Record<string, any> | null): Record<string, any> {
  return { ...(json ?? {}), engineVersion: KPI_ENGINE_VERSION };
}

// ── Input types ─────────────────────────────────────────────────────

export interface TaskSnapshot {
  status: string;
  actualStartAt: Date | null;
  completedAt: Date | null;
  estimatePoints: number | null;
}

export interface IterationSnapshot {
  id: string;
  name: string;
  status: string;
  completedPoints: number | null;
}

export interface BudgetSnapshot {
  baselineBudget: string;
  revisedBudget: string;
  forecastAtCompletion: string;
}

export interface ProjectCostSnapshot {
  actualCost: number | null;
}

export interface EvSnapshot {
  ev: number | null;
  pv: number | null;
}

export interface ChangeRequestSnapshot {
  status: string;
  createdAt: Date;
  approvedAt: Date | null;
}

// ── Calculators ─────────────────────────────────────────────────────

export function calcWip(tasks: TaskSnapshot[]): KpiComputeResult {
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS');
  return {
    valueNumeric: inProgress.length,
    valueText: null,
    valueJson: withMeta({ statusFilter: 'IN_PROGRESS' }),
    sampleSize: tasks.length,
  };
}

export function calcThroughput(
  tasks: TaskSnapshot[],
  windowDays = 7,
): KpiComputeResult {
  const now = new Date();
  const from = new Date(now.getTime() - windowDays * 86_400_000);
  const completed = tasks.filter(
    (t) => t.completedAt && new Date(t.completedAt) >= from,
  );
  return {
    valueNumeric: completed.length,
    valueText: null,
    valueJson: withMeta({ windowDays }),
    sampleSize: completed.length,
  };
}

export function calcCycleTime(tasks: TaskSnapshot[]): KpiComputeResult {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86_400_000);

  const eligible = tasks.filter(
    (t) =>
      t.completedAt &&
      t.actualStartAt &&
      new Date(t.completedAt) >= from,
  );

  if (eligible.length === 0) {
    return { valueNumeric: null, valueText: null, valueJson: withMeta({ reason: 'no_eligible_tasks' }), sampleSize: 0 };
  }

  const totalDays = eligible.reduce((sum, t) => {
    const started = new Date(t.actualStartAt!).getTime();
    const completed = new Date(t.completedAt!).getTime();
    return sum + (completed - started) / 86_400_000;
  }, 0);

  const avg = Math.round((totalDays / eligible.length) * 100) / 100;
  return {
    valueNumeric: avg,
    valueText: null,
    valueJson: withMeta({ windowDays: 30 }),
    sampleSize: eligible.length,
  };
}

export function calcVelocity(
  iterations: IterationSnapshot[],
): KpiComputeResult {
  const completed = iterations.filter((i) => i.status === 'COMPLETED');
  if (completed.length === 0) {
    return { valueNumeric: null, valueText: null, valueJson: withMeta({ reason: 'no_completed_iterations' }), sampleSize: 0 };
  }

  const series = completed.map((i) => ({
    name: i.name,
    points: i.completedPoints ?? 0,
  }));

  const totalPoints = series.reduce((s, i) => s + i.points, 0);
  const avg = Math.round((totalPoints / completed.length) * 100) / 100;

  return {
    valueNumeric: avg,
    valueText: null,
    valueJson: withMeta({ sprints: series, methodUsed: 'completedPoints' }),
    sampleSize: completed.length,
  };
}

export function calcBudgetBurn(
  budget: BudgetSnapshot | null,
  project: ProjectCostSnapshot | null,
): KpiComputeResult {
  if (!budget || !project) {
    return { valueNumeric: null, valueText: null, valueJson: withMeta({ reason: 'missing_input' }), sampleSize: 0 };
  }

  const baseline = parseFloat(budget.baselineBudget);
  const actual = project.actualCost ?? 0;

  if (!baseline || baseline <= 0) {
    return {
      valueNumeric: null,
      valueText: null,
      valueJson: withMeta({ reason: 'baseline_budget_zero' }),
      sampleSize: 0,
    };
  }

  const burn = Math.round((actual / baseline) * 10000) / 100;
  return {
    valueNumeric: burn,
    valueText: null,
    valueJson: withMeta({ baselineBudget: baseline, actualCost: actual }),
    sampleSize: 1,
  };
}

export function calcForecastAtCompletion(
  budget: BudgetSnapshot | null,
): KpiComputeResult {
  if (!budget) {
    return { valueNumeric: null, valueText: null, valueJson: withMeta({ reason: 'missing_input' }), sampleSize: 0 };
  }

  const fac = parseFloat(budget.forecastAtCompletion);
  if (fac && fac > 0) {
    return {
      valueNumeric: fac,
      valueText: null,
      valueJson: withMeta({ source: 'forecastAtCompletion' }),
      sampleSize: 1,
    };
  }

  const revised = parseFloat(budget.revisedBudget);
  if (revised && revised > 0) {
    return {
      valueNumeric: revised,
      valueText: null,
      valueJson: withMeta({ source: 'revisedBudget_fallback' }),
      sampleSize: 1,
    };
  }

  return {
    valueNumeric: null,
    valueText: null,
    valueJson: withMeta({ source: 'none_available' }),
    sampleSize: 0,
  };
}

export function calcScheduleVariance(
  snapshot: EvSnapshot | null,
): KpiComputeResult {
  if (!snapshot || snapshot.ev == null || snapshot.pv == null) {
    return {
      valueNumeric: null,
      valueText: null,
      valueJson: withMeta({ reason: 'missing_ev_data' }),
      sampleSize: 0,
    };
  }

  const sv = Math.round((Number(snapshot.ev) - Number(snapshot.pv)) * 100) / 100;
  return {
    valueNumeric: sv,
    valueText: null,
    valueJson: withMeta({ ev: Number(snapshot.ev), pv: Number(snapshot.pv) }),
    sampleSize: 1,
  };
}

export function calcSpi(snapshot: EvSnapshot | null): KpiComputeResult {
  if (!snapshot || snapshot.ev == null || snapshot.pv == null) {
    return {
      valueNumeric: null,
      valueText: null,
      valueJson: withMeta({ reason: 'missing_ev_data' }),
      sampleSize: 0,
    };
  }

  const pv = Number(snapshot.pv);
  if (pv === 0) {
    return {
      valueNumeric: null,
      valueText: null,
      valueJson: withMeta({ reason: 'pv_is_zero' }),
      sampleSize: 0,
    };
  }

  const spi = Math.round((Number(snapshot.ev) / pv) * 10000) / 10000;
  return {
    valueNumeric: spi,
    valueText: null,
    valueJson: withMeta({ ev: Number(snapshot.ev), pv }),
    sampleSize: 1,
  };
}

export function calcChangeRequestCycleTime(
  crs: ChangeRequestSnapshot[],
): KpiComputeResult {
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 86_400_000);

  const approved = crs.filter(
    (cr) =>
      cr.status === 'APPROVED' &&
      cr.approvedAt &&
      new Date(cr.approvedAt) >= from,
  );

  if (approved.length === 0) {
    return { valueNumeric: null, valueText: null, valueJson: withMeta({ reason: 'no_approved_crs' }), sampleSize: 0 };
  }

  const totalDays = approved.reduce((sum, cr) => {
    const created = new Date(cr.createdAt).getTime();
    const approvedDate = new Date(cr.approvedAt!).getTime();
    return sum + (approvedDate - created) / 86_400_000;
  }, 0);

  const avg = Math.round((totalDays / approved.length) * 100) / 100;
  return {
    valueNumeric: avg,
    valueText: null,
    valueJson: withMeta({ windowDays: 90 }),
    sampleSize: approved.length,
  };
}

export function calcChangeRequestApprovalRate(
  crs: ChangeRequestSnapshot[],
): KpiComputeResult {
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 86_400_000);

  const recent = crs.filter((cr) => new Date(cr.createdAt) >= from);
  const approved = recent.filter((cr) => cr.status === 'APPROVED').length;
  const rejected = recent.filter((cr) => cr.status === 'REJECTED').length;
  const total = approved + rejected;

  if (total === 0) {
    return { valueNumeric: null, valueText: null, valueJson: withMeta({ reason: 'no_terminal_crs' }), sampleSize: 0 };
  }

  const rate = Math.round((approved / total) * 10000) / 100;
  return {
    valueNumeric: rate,
    valueText: null,
    valueJson: withMeta({ approved, rejected, windowDays: 90 }),
    sampleSize: total,
  };
}

export function calcOpenRiskCount(riskCount: number): KpiComputeResult {
  return {
    valueNumeric: riskCount,
    valueText: null,
    valueJson: withMeta({ statusFilter: 'OPEN' }),
    sampleSize: 1,
  };
}

export function calcEscapedDefects(): KpiComputeResult {
  return {
    valueNumeric: null,
    valueText: null,
    valueJson: withMeta({ status: 'not_supported_mvp' }),
    sampleSize: 0,
  };
}

/** Dispatch by calculation_strategy code. */
export const CALCULATOR_MAP: Record<
  string,
  (...args: any[]) => KpiComputeResult
> = {
  wip: calcWip,
  throughput: calcThroughput,
  cycle_time: calcCycleTime,
  velocity: calcVelocity,
  budget_burn: calcBudgetBurn,
  forecast_at_completion: calcForecastAtCompletion,
  schedule_variance: calcScheduleVariance,
  spi: calcSpi,
  change_request_cycle_time: calcChangeRequestCycleTime,
  change_request_approval_rate: calcChangeRequestApprovalRate,
  open_risk_count: calcOpenRiskCount,
  escaped_defects: calcEscapedDefects,
};
