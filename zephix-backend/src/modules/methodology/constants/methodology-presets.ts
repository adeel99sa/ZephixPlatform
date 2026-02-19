import {
  EstimationType,
  LifecycleType,
  MethodologyCode,
  MethodologyPreset,
  WipEnforcement,
} from '../interfaces/methodology-config.interface';

/**
 * Methodology presets are DEFAULT configurations — not enforcement rules.
 * Org admins can fully override any field. Data-integrity constraints
 * (e.g. "can't disable sprints if iterations exist") are enforced at runtime
 * by the validator's consistency checks, not by methodology-brand locks.
 */

export const SCRUM_PRESET: MethodologyPreset = {
  config: {
    lifecycleType: LifecycleType.ITERATIVE,
    methodologyCode: MethodologyCode.SCRUM,
    sprint: { enabled: true, defaultLengthDays: 14 },
    phases: { gateRequired: false, minPhases: 0, minGates: 0 },
    wip: {
      enabled: false,
      enforcement: WipEnforcement.OFF,
      defaultLimit: null,
      perStatusLimits: null,
    },
    estimation: { type: EstimationType.POINTS },
    governance: {
      iterationsEnabled: true,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: false,
      changeManagementEnabled: false,
      waterfallEnabled: false,
    },
    kpiPack: { packCode: 'scrum_core', overrideTargets: null },
    ui: {
      tabs: ['overview', 'tasks', 'board', 'sprints', 'kpis', 'risks'],
    },
  },
};

export const KANBAN_PRESET: MethodologyPreset = {
  config: {
    lifecycleType: LifecycleType.FLOW,
    methodologyCode: MethodologyCode.KANBAN,
    sprint: { enabled: false, defaultLengthDays: 14 },
    phases: { gateRequired: false, minPhases: 0, minGates: 0 },
    wip: {
      enabled: true,
      enforcement: WipEnforcement.BLOCK,
      defaultLimit: 5,
      perStatusLimits: { in_progress: 3, in_review: 2 },
    },
    estimation: { type: EstimationType.NONE },
    governance: {
      iterationsEnabled: false,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: true,
      changeManagementEnabled: false,
      waterfallEnabled: false,
    },
    kpiPack: { packCode: 'kanban_flow', overrideTargets: null },
    ui: { tabs: ['overview', 'board', 'tasks', 'kpis'] },
  },
};

export const WATERFALL_PRESET: MethodologyPreset = {
  config: {
    lifecycleType: LifecycleType.PHASED,
    methodologyCode: MethodologyCode.WATERFALL,
    sprint: { enabled: false, defaultLengthDays: 14 },
    phases: { gateRequired: true, minPhases: 3, minGates: 1 },
    wip: {
      enabled: false,
      enforcement: WipEnforcement.OFF,
      defaultLimit: null,
      perStatusLimits: null,
    },
    estimation: { type: EstimationType.HOURS },
    governance: {
      iterationsEnabled: false,
      costTrackingEnabled: true,
      baselinesEnabled: true,
      earnedValueEnabled: true,
      capacityEnabled: true,
      changeManagementEnabled: true,
      waterfallEnabled: true,
    },
    kpiPack: { packCode: 'waterfall_evm', overrideTargets: null },
    ui: {
      tabs: [
        'overview',
        'plan',
        'tasks',
        'gantt',
        'budget',
        'change-requests',
        'documents',
        'kpis',
        'risks',
        'resources',
      ],
    },
  },
};

export const HYBRID_PRESET: MethodologyPreset = {
  config: {
    lifecycleType: LifecycleType.HYBRID,
    methodologyCode: MethodologyCode.HYBRID,
    sprint: { enabled: true, defaultLengthDays: 14 },
    phases: { gateRequired: false, minPhases: 2, minGates: 0 },
    wip: {
      enabled: false,
      enforcement: WipEnforcement.OFF,
      defaultLimit: null,
      perStatusLimits: null,
    },
    estimation: { type: EstimationType.BOTH },
    governance: {
      iterationsEnabled: true,
      costTrackingEnabled: true,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: true,
      changeManagementEnabled: true,
      waterfallEnabled: false,
    },
    kpiPack: { packCode: 'hybrid_core', overrideTargets: null },
    ui: {
      tabs: [
        'overview',
        'plan',
        'tasks',
        'board',
        'sprints',
        'budget',
        'change-requests',
        'kpis',
        'risks',
      ],
    },
  },
};

export const AGILE_PRESET: MethodologyPreset = {
  config: {
    lifecycleType: LifecycleType.FLEXIBLE,
    methodologyCode: MethodologyCode.AGILE,
    sprint: { enabled: true, defaultLengthDays: 14 },
    phases: { gateRequired: false, minPhases: 0, minGates: 0 },
    wip: {
      enabled: false,
      enforcement: WipEnforcement.OFF,
      defaultLimit: null,
      perStatusLimits: null,
    },
    estimation: { type: EstimationType.POINTS },
    governance: {
      iterationsEnabled: true,
      costTrackingEnabled: false,
      baselinesEnabled: false,
      earnedValueEnabled: false,
      capacityEnabled: false,
      changeManagementEnabled: false,
      waterfallEnabled: false,
    },
    kpiPack: { packCode: 'agile_flex', overrideTargets: null },
    ui: {
      tabs: ['overview', 'tasks', 'board', 'sprints', 'kpis', 'risks'],
    },
  },
};

export const METHODOLOGY_PRESETS: Record<MethodologyCode, MethodologyPreset> = {
  [MethodologyCode.SCRUM]: SCRUM_PRESET,
  [MethodologyCode.KANBAN]: KANBAN_PRESET,
  [MethodologyCode.WATERFALL]: WATERFALL_PRESET,
  [MethodologyCode.HYBRID]: HYBRID_PRESET,
  [MethodologyCode.AGILE]: AGILE_PRESET,
};
