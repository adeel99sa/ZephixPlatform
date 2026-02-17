/**
 * Wave 10: KPI Queue Constants
 * Queue names, job types, delays, and retry configuration.
 */

export const QUEUE_NAMES = {
  KPI_RECOMPUTE: 'kpi-recompute',
  KPI_ROLLUP: 'kpi-rollup',
  KPI_SCHEDULER: 'kpi-scheduler',
} as const;

export const JOB_TYPES = {
  PROJECT_KPI_RECOMPUTE: 'PROJECT_KPI_RECOMPUTE',
  PROJECT_KPI_RECOMPUTE_ALL: 'PROJECT_KPI_RECOMPUTE_ALL',
  PORTFOLIO_ROLLUP_RECOMPUTE: 'PORTFOLIO_ROLLUP_RECOMPUTE',
  PROGRAM_ROLLUP_RECOMPUTE: 'PROGRAM_ROLLUP_RECOMPUTE',
  NIGHTLY_PROJECT_REFRESH: 'NIGHTLY_PROJECT_REFRESH',
  PERIODIC_STALE_REFRESH: 'PERIODIC_STALE_REFRESH',
} as const;

export const DELAYS = {
  PROJECT_RECOMPUTE_MS: 30_000,
  ROLLUP_MS: 60_000,
} as const;

export const RETRY_CONFIG = {
  KPI_RECOMPUTE: {
    attempts: 8,
    backoff: { type: 'exponential' as const, delay: 30_000, maxDelay: 1_800_000 },
    removeOnComplete: true,
    removeOnFail: { count: 50 },
  },
  KPI_ROLLUP: {
    attempts: 10,
    backoff: { type: 'exponential' as const, delay: 60_000, maxDelay: 3_600_000 },
    removeOnComplete: true,
    removeOnFail: { count: 50 },
  },
  KPI_SCHEDULER: {
    attempts: 3,
    backoff: { type: 'fixed' as const, delay: 300_000 },
    removeOnComplete: true,
    removeOnFail: { count: 20 },
  },
} as const;

export const WORKER_CONCURRENCY = {
  KPI_RECOMPUTE: 10,
  KPI_ROLLUP: 5,
  KPI_SCHEDULER: 1,
} as const;

export const RATE_LIMIT = {
  TOKENS_PER_SECOND: 2,
  BURST: 10,
  REQUEUE_DELAY_MS: 30_000,
} as const;

// ── Domain event names ──────────────────────────────────────────────────────

export const DOMAIN_EVENTS = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  TASK_DELETED: 'TASK_DELETED',
  ALLOCATION_CREATED: 'ALLOCATION_CREATED',
  ALLOCATION_UPDATED: 'ALLOCATION_UPDATED',
  BUDGET_UPDATED: 'BUDGET_UPDATED',
  CHANGE_REQUEST_STATUS_CHANGED: 'CHANGE_REQUEST_STATUS_CHANGED',
  RISK_CREATED: 'RISK_CREATED',
  RISK_UPDATED: 'RISK_UPDATED',
  PROJECT_ASSIGNED_TO_PORTFOLIO: 'PROJECT_ASSIGNED_TO_PORTFOLIO',
  PROJECT_REMOVED_FROM_PORTFOLIO: 'PROJECT_REMOVED_FROM_PORTFOLIO',
  PROJECT_ASSIGNED_TO_PROGRAM: 'PROJECT_ASSIGNED_TO_PROGRAM',
  PROJECT_REMOVED_FROM_PROGRAM: 'PROJECT_REMOVED_FROM_PROGRAM',
  PORTFOLIO_GOVERNANCE_CHANGED: 'PORTFOLIO_GOVERNANCE_CHANGED',
  PROGRAM_GOVERNANCE_CHANGED: 'PROGRAM_GOVERNANCE_CHANGED',
} as const;

/** Maps domain events to the KPI codes they affect. */
export const EVENT_KPI_MAP: Record<string, string[]> = {
  [DOMAIN_EVENTS.TASK_CREATED]: ['throughput', 'wip', 'cycle_time', 'velocity'],
  [DOMAIN_EVENTS.TASK_UPDATED]: ['throughput', 'wip', 'cycle_time', 'velocity'],
  [DOMAIN_EVENTS.TASK_STATUS_CHANGED]: ['throughput', 'wip', 'cycle_time', 'escaped_defects', 'velocity'],
  [DOMAIN_EVENTS.TASK_DELETED]: ['throughput', 'wip', 'cycle_time', 'velocity'],
  [DOMAIN_EVENTS.BUDGET_UPDATED]: ['budget_burn', 'forecast_at_completion'],
  [DOMAIN_EVENTS.CHANGE_REQUEST_STATUS_CHANGED]: ['change_request_approval_rate', 'change_request_cycle_time'],
  [DOMAIN_EVENTS.RISK_CREATED]: ['open_risk_count'],
  [DOMAIN_EVENTS.RISK_UPDATED]: ['open_risk_count'],
  [DOMAIN_EVENTS.ALLOCATION_CREATED]: [],
  [DOMAIN_EVENTS.ALLOCATION_UPDATED]: [],
};
