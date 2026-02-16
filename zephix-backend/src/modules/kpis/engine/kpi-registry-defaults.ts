/**
 * Wave 4A: MVP KPI Registry Defaults
 *
 * 12 deterministic definitions inserted on demand via upsert-by-code.
 * No external seed script needed — the definitions service calls ensureDefaults()
 * on first access.
 */

export interface KpiDefaultDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
  lifecyclePhase: string;
  formulaType: string;
  dataSources: string[];
  requiredGovernanceFlag: string | null;
  isLeading: boolean;
  isLagging: boolean;
  defaultEnabled: boolean;
  calculationStrategy: string;
  unit: string;
  direction: string;
}

export const KPI_REGISTRY_DEFAULTS: KpiDefaultDefinition[] = [
  // ── Delivery (4) ──────────────────────────────────────────────────
  {
    code: 'velocity',
    name: 'Sprint Velocity',
    description: 'Average story points completed per sprint',
    category: 'DELIVERY',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'AGGREGATE',
    dataSources: ['iterations'],
    requiredGovernanceFlag: 'iterationsEnabled',
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'velocity',
    unit: 'points',
    direction: 'higher_better',
  },
  {
    code: 'cycle_time',
    name: 'Cycle Time',
    description: 'Average days from started to done for completed tasks (30-day window)',
    category: 'DELIVERY',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'SIMPLE',
    dataSources: ['tasks'],
    requiredGovernanceFlag: null,
    isLeading: true,
    isLagging: false,
    defaultEnabled: true,
    calculationStrategy: 'cycle_time',
    unit: 'days',
    direction: 'lower_better',
  },
  {
    code: 'throughput',
    name: 'Throughput',
    description: 'Number of tasks completed in last 7 days',
    category: 'DELIVERY',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'SIMPLE',
    dataSources: ['tasks'],
    requiredGovernanceFlag: null,
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'throughput',
    unit: 'items',
    direction: 'higher_better',
  },
  {
    code: 'wip',
    name: 'Work In Progress',
    description: 'Count of tasks currently in progress',
    category: 'DELIVERY',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'SIMPLE',
    dataSources: ['tasks'],
    requiredGovernanceFlag: null,
    isLeading: true,
    isLagging: false,
    defaultEnabled: true,
    calculationStrategy: 'wip',
    unit: 'items',
    direction: 'lower_better',
  },

  // ── Schedule (2) ──────────────────────────────────────────────────
  {
    code: 'schedule_variance',
    name: 'Schedule Variance',
    description: 'EV minus PV from earned value snapshots',
    category: 'SCHEDULE',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'RATIO',
    dataSources: ['earned_value_snapshots'],
    requiredGovernanceFlag: 'baselinesEnabled',
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'schedule_variance',
    unit: 'currency',
    direction: 'higher_better',
  },
  {
    code: 'spi',
    name: 'Schedule Performance Index',
    description: 'EV divided by PV from earned value snapshots',
    category: 'SCHEDULE',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'RATIO',
    dataSources: ['earned_value_snapshots'],
    requiredGovernanceFlag: 'baselinesEnabled',
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'spi',
    unit: 'ratio',
    direction: 'higher_better',
  },

  // ── Financial (2) ─────────────────────────────────────────────────
  {
    code: 'budget_burn',
    name: 'Budget Burn Rate',
    description: 'Actual cost divided by baseline budget',
    category: 'FINANCIAL',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'RATIO',
    dataSources: ['budgets', 'projects'],
    requiredGovernanceFlag: 'costTrackingEnabled',
    isLeading: true,
    isLagging: false,
    defaultEnabled: false,
    calculationStrategy: 'budget_burn',
    unit: 'percent',
    direction: 'lower_better',
  },
  {
    code: 'forecast_at_completion',
    name: 'Forecast at Completion',
    description: 'Projected total cost at project completion',
    category: 'FINANCIAL',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'SIMPLE',
    dataSources: ['budgets'],
    requiredGovernanceFlag: 'costTrackingEnabled',
    isLeading: true,
    isLagging: false,
    defaultEnabled: false,
    calculationStrategy: 'forecast_at_completion',
    unit: 'currency',
    direction: 'lower_better',
  },

  // ── Quality (1) ───────────────────────────────────────────────────
  {
    code: 'escaped_defects',
    name: 'Escaped Defects',
    description: 'Placeholder — defect module not yet implemented',
    category: 'QUALITY',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'SIMPLE',
    dataSources: [],
    requiredGovernanceFlag: null,
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'escaped_defects',
    unit: 'items',
    direction: 'lower_better',
  },

  // ── Risk (1) ──────────────────────────────────────────────────────
  {
    code: 'open_risk_count',
    name: 'Open Risk Count',
    description: 'Number of risks with status OPEN',
    category: 'RISK',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'SIMPLE',
    dataSources: ['risks'],
    requiredGovernanceFlag: null,
    isLeading: true,
    isLagging: false,
    defaultEnabled: true,
    calculationStrategy: 'open_risk_count',
    unit: 'items',
    direction: 'lower_better',
  },

  // ── Change (2) ────────────────────────────────────────────────────
  {
    code: 'change_request_cycle_time',
    name: 'Change Request Cycle Time',
    description: 'Average days from creation to approval for approved CRs (90-day window)',
    category: 'CHANGE',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'SIMPLE',
    dataSources: ['change_requests'],
    requiredGovernanceFlag: 'changeManagementEnabled',
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'change_request_cycle_time',
    unit: 'days',
    direction: 'lower_better',
  },
  {
    code: 'change_request_approval_rate',
    name: 'Change Request Approval Rate',
    description: 'Approved / (Approved + Rejected) as percentage (90-day window)',
    category: 'CHANGE',
    lifecyclePhase: 'MONITORING_CONTROL',
    formulaType: 'RATIO',
    dataSources: ['change_requests'],
    requiredGovernanceFlag: 'changeManagementEnabled',
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'change_request_approval_rate',
    unit: 'percent',
    direction: 'higher_better',
  },
];
