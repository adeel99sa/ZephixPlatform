export enum LifecycleType {
  ITERATIVE = 'iterative',
  FLOW = 'flow',
  PHASED = 'phased',
  HYBRID = 'hybrid',
  FLEXIBLE = 'flexible',
}

export enum MethodologyCode {
  SCRUM = 'scrum',
  KANBAN = 'kanban',
  WATERFALL = 'waterfall',
  HYBRID = 'hybrid',
  AGILE = 'agile',
}

export enum EstimationType {
  POINTS = 'points',
  HOURS = 'hours',
  BOTH = 'both',
  NONE = 'none',
}

export enum WipEnforcement {
  OFF = 'off',
  WARN = 'warn',
  BLOCK = 'block',
}

export interface SprintConfig {
  enabled: boolean;
  defaultLengthDays: number;
}

export interface PhasesConfig {
  gateRequired: boolean;
  minPhases: number;
  minGates: number;
}

export interface WipConfig {
  enabled: boolean;
  enforcement: WipEnforcement;
  defaultLimit: number | null;
  perStatusLimits: Record<string, number> | null;
}

export interface EstimationConfig {
  type: EstimationType;
}

export interface GovernanceFlagsConfig {
  iterationsEnabled: boolean;
  costTrackingEnabled: boolean;
  baselinesEnabled: boolean;
  earnedValueEnabled: boolean;
  capacityEnabled: boolean;
  changeManagementEnabled: boolean;
  waterfallEnabled: boolean;
}

export interface KpiPackConfig {
  packCode: string;
  overrideTargets: Record<string, number> | null;
}

export interface UiConfig {
  tabs: string[];
}

/**
 * MethodologyConfig v1 — stored as JSONB on the Project entity.
 *
 * Drives all methodology-specific behavior across the platform.
 * Service code branches on resolved fields (e.g. sprint.enabled),
 * never on methodologyCode directly.
 */
export interface MethodologyConfig {
  lifecycleType: LifecycleType;
  methodologyCode: MethodologyCode;
  sprint: SprintConfig;
  phases: PhasesConfig;
  wip: WipConfig;
  estimation: EstimationConfig;
  governance: GovernanceFlagsConfig;
  kpiPack: KpiPackConfig;
  ui: UiConfig;
}

/**
 * Capability-level integrity locks. These are NOT methodology-brand rules.
 * They protect data integrity: if a capability is active and has persisted data,
 * it cannot be disabled without data loss.
 *
 * Example: if a project has active iterations (sprint data exists),
 * sprint.enabled cannot be turned off. This is a data integrity rule,
 * not a "Scrum requires sprints" rule.
 *
 * Presets may suggest defaults but do NOT lock them. Org admins can override
 * any default. Only data-integrity constraints are enforced at runtime.
 */
export interface CapabilityLocks {
  sprintRequiresIterationData?: boolean;
  wipRequiresWorkflowConfig?: boolean;
  gateRequiresPhaseGateDefinitions?: boolean;
  costTrackingRequiresBudgetData?: boolean;
  earnedValueRequiresCostTracking?: boolean;
}

export interface MethodologyPreset {
  config: MethodologyConfig;
}

export const ALL_PROJECT_TABS = [
  'overview',
  'plan',
  'tasks',
  'board',
  'gantt',
  'sprints',
  'risks',
  'resources',
  'change-requests',
  'documents',
  'budget',
  'kpis',
] as const;

export type ProjectTab = (typeof ALL_PROJECT_TABS)[number];
