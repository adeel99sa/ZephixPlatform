import {
  QUEUE_NAMES,
  JOB_TYPES,
  DELAYS,
  RETRY_CONFIG,
  WORKER_CONCURRENCY,
  DOMAIN_EVENTS,
  EVENT_KPI_MAP,
} from '../constants/queue.constants';

describe('Queue Constants', () => {
  it('defines 3 queue names', () => {
    expect(Object.keys(QUEUE_NAMES)).toHaveLength(3);
    expect(QUEUE_NAMES.KPI_RECOMPUTE).toBe('kpi-recompute');
    expect(QUEUE_NAMES.KPI_ROLLUP).toBe('kpi-rollup');
    expect(QUEUE_NAMES.KPI_SCHEDULER).toBe('kpi-scheduler');
  });

  it('defines all job types', () => {
    expect(JOB_TYPES.PROJECT_KPI_RECOMPUTE).toBeDefined();
    expect(JOB_TYPES.PROJECT_KPI_RECOMPUTE_ALL).toBeDefined();
    expect(JOB_TYPES.PORTFOLIO_ROLLUP_RECOMPUTE).toBeDefined();
    expect(JOB_TYPES.PROGRAM_ROLLUP_RECOMPUTE).toBeDefined();
    expect(JOB_TYPES.NIGHTLY_PROJECT_REFRESH).toBeDefined();
    expect(JOB_TYPES.PERIODIC_STALE_REFRESH).toBeDefined();
  });

  it('project recompute delay is 30s', () => {
    expect(DELAYS.PROJECT_RECOMPUTE_MS).toBe(30_000);
  });

  it('rollup delay is 60s', () => {
    expect(DELAYS.ROLLUP_MS).toBe(60_000);
  });

  it('recompute retry config has 8 attempts', () => {
    expect(RETRY_CONFIG.KPI_RECOMPUTE.attempts).toBe(8);
    expect(RETRY_CONFIG.KPI_RECOMPUTE.backoff.type).toBe('exponential');
  });

  it('rollup retry config has 10 attempts', () => {
    expect(RETRY_CONFIG.KPI_ROLLUP.attempts).toBe(10);
  });

  it('scheduler retry config has 3 attempts', () => {
    expect(RETRY_CONFIG.KPI_SCHEDULER.attempts).toBe(3);
  });

  it('worker concurrency matches spec', () => {
    expect(WORKER_CONCURRENCY.KPI_RECOMPUTE).toBe(10);
    expect(WORKER_CONCURRENCY.KPI_ROLLUP).toBe(5);
    expect(WORKER_CONCURRENCY.KPI_SCHEDULER).toBe(1);
  });

  it('all domain events have a mapping', () => {
    const allEvents = Object.values(DOMAIN_EVENTS);
    expect(allEvents.length).toBeGreaterThanOrEqual(10);

    // Task events map to specific KPIs
    expect(EVENT_KPI_MAP[DOMAIN_EVENTS.TASK_STATUS_CHANGED]).toContain('throughput');
    expect(EVENT_KPI_MAP[DOMAIN_EVENTS.BUDGET_UPDATED]).toContain('budget_burn');
    expect(EVENT_KPI_MAP[DOMAIN_EVENTS.RISK_CREATED]).toContain('open_risk_count');
  });
});
