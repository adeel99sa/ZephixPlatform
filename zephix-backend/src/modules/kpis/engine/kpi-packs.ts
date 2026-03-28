/**
 * Wave 4D: Curated KPI Packs
 *
 * Each pack is a set of KPI code bindings aligned to a delivery methodology.
 * Uses only codes from the 12 MVP definitions in kpi-registry-defaults.ts.
 * Packs do not create new definitions — they reference existing ones.
 */

export interface KpiPackBinding {
  kpiCode: string;
  isRequired: boolean;
  defaultTarget?: string;
}

export interface KpiPack {
  packCode: string;
  name: string;
  description: string;
  bindings: KpiPackBinding[];
}

export const KPI_PACKS: KpiPack[] = [
  {
    packCode: 'scrum_core',
    name: 'Agile Scrum Core',
    description:
      'Sprint-focused delivery metrics for Scrum teams: velocity, throughput, WIP limits, and defect tracking.',
    bindings: [
      { kpiCode: 'velocity', isRequired: true, defaultTarget: '30' },
      { kpiCode: 'throughput', isRequired: false },
      { kpiCode: 'wip', isRequired: true, defaultTarget: '10' },
      { kpiCode: 'escaped_defects', isRequired: false },
    ],
  },
  {
    packCode: 'kanban_flow',
    name: 'Kanban Flow',
    description:
      'Flow-based metrics for Kanban teams: cycle time, throughput, WIP, and risk awareness.',
    bindings: [
      { kpiCode: 'cycle_time', isRequired: true, defaultTarget: '5' },
      { kpiCode: 'throughput', isRequired: true },
      { kpiCode: 'wip', isRequired: true, defaultTarget: '8' },
      { kpiCode: 'open_risk_count', isRequired: false },
    ],
  },
  {
    packCode: 'waterfall_evm',
    name: 'Waterfall Schedule & EV',
    description:
      'Earned value and financial tracking for waterfall/plan-driven projects.',
    bindings: [
      { kpiCode: 'schedule_variance', isRequired: true },
      { kpiCode: 'spi', isRequired: true, defaultTarget: '1.0' },
      { kpiCode: 'budget_burn', isRequired: true },
      { kpiCode: 'forecast_at_completion', isRequired: true },
    ],
  },
  {
    packCode: 'hybrid_core',
    name: 'Hybrid Core',
    description:
      'Cross-method KPIs for hybrid projects: flow metrics, cost tracking, risk, and change management.',
    bindings: [
      { kpiCode: 'cycle_time', isRequired: false },
      { kpiCode: 'budget_burn', isRequired: false },
      { kpiCode: 'forecast_at_completion', isRequired: false },
      { kpiCode: 'open_risk_count', isRequired: false },
      { kpiCode: 'change_request_approval_rate', isRequired: false },
    ],
  },
];

/**
 * Lookup helper. Returns undefined if packCode not found.
 */
export function findKpiPack(packCode: string): KpiPack | undefined {
  return KPI_PACKS.find((p) => p.packCode === packCode);
}
