export interface KpiPackDefinition {
  packCode: string;
  name: string;
  methodology: string;
  requiredKpis: string[];
  optionalKpis: string[];
  defaultTargets: Record<string, { value: number; direction: 'higher_is_better' | 'lower_is_better' }>;
}

export const KPI_PACKS: Record<string, KpiPackDefinition> = {
  scrum_core: {
    packCode: 'scrum_core',
    name: 'Scrum Core',
    methodology: 'scrum',
    requiredKpis: ['velocity', 'burndown_remaining', 'throughput'],
    optionalKpis: [
      'escaped_defects',
      'cycle_time',
      'open_risk_count',
    ],
    defaultTargets: {
      velocity: { value: 30, direction: 'higher_is_better' },
      throughput: { value: 10, direction: 'higher_is_better' },
    },
  },

  kanban_flow: {
    packCode: 'kanban_flow',
    name: 'Kanban Flow',
    methodology: 'kanban',
    requiredKpis: ['cycle_time', 'lead_time', 'throughput', 'wip'],
    optionalKpis: ['flow_efficiency', 'aging_wip'],
    defaultTargets: {
      cycle_time: { value: 5, direction: 'lower_is_better' },
      lead_time: { value: 10, direction: 'lower_is_better' },
      throughput: { value: 15, direction: 'higher_is_better' },
      wip: { value: 5, direction: 'lower_is_better' },
    },
  },

  waterfall_evm: {
    packCode: 'waterfall_evm',
    name: 'Waterfall EVM',
    methodology: 'waterfall',
    requiredKpis: [
      'spi',
      'schedule_variance',
      'budget_burn',
      'forecast_at_completion',
    ],
    optionalKpis: [
      'open_risk_count',
      'change_request_cycle_time',
      'change_request_approval_rate',
      'escaped_defects',
    ],
    defaultTargets: {
      spi: { value: 1.0, direction: 'higher_is_better' },
      budget_burn: { value: 100, direction: 'lower_is_better' },
    },
  },

  hybrid_core: {
    packCode: 'hybrid_core',
    name: 'Hybrid Core',
    methodology: 'hybrid',
    requiredKpis: [
      'throughput',
      'cycle_time',
      'schedule_variance',
      'budget_burn',
    ],
    optionalKpis: [
      'velocity',
      'spi',
      'change_request_cycle_time',
      'change_request_approval_rate',
      'open_risk_count',
    ],
    defaultTargets: {
      throughput: { value: 12, direction: 'higher_is_better' },
      cycle_time: { value: 7, direction: 'lower_is_better' },
    },
  },

  agile_flex: {
    packCode: 'agile_flex',
    name: 'Agile Flex',
    methodology: 'agile',
    requiredKpis: ['throughput', 'cycle_time'],
    optionalKpis: [
      'velocity',
      'wip',
      'burndown_remaining',
      'open_risk_count',
      'escaped_defects',
    ],
    defaultTargets: {
      throughput: { value: 10, direction: 'higher_is_better' },
      cycle_time: { value: 7, direction: 'lower_is_better' },
    },
  },
};
