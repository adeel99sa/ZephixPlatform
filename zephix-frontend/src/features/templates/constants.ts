/**
 * Wave 6: Single source of truth for template tab IDs, delivery methods, and governance flags.
 * Must stay in sync with backend: zephix-backend/src/modules/templates/constants/template-defaults.ts
 */

export const VALID_TAB_IDS = [
  'overview',
  'plan',
  'tasks',
  'board',
  'gantt',
  'risks',
  'resources',
  'change-requests',
  'documents',
  'budget',
  'kpis',
] as const;

export type ValidTabId = (typeof VALID_TAB_IDS)[number];

export const VALID_DELIVERY_METHODS = [
  'SCRUM',
  'KANBAN',
  'WATERFALL',
  'HYBRID',
] as const;

export type ValidDeliveryMethod = (typeof VALID_DELIVERY_METHODS)[number];

export const GOVERNANCE_FLAGS = [
  { key: 'iterationsEnabled', label: 'Iterations' },
  { key: 'costTrackingEnabled', label: 'Cost Tracking' },
  { key: 'baselinesEnabled', label: 'Baselines' },
  { key: 'earnedValueEnabled', label: 'Earned Value' },
  { key: 'capacityEnabled', label: 'Capacity' },
  { key: 'changeManagementEnabled', label: 'Change Management' },
  { key: 'waterfallEnabled', label: 'Waterfall' },
] as const;
