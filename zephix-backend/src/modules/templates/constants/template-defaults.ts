/**
 * Wave 6: Single source of truth for template tab IDs, delivery methods, and governance flags.
 * Used by DTOs, validators, seed scripts, and tests.
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

export const VALID_GOVERNANCE_FLAGS = [
  'iterationsEnabled',
  'costTrackingEnabled',
  'baselinesEnabled',
  'earnedValueEnabled',
  'capacityEnabled',
  'changeManagementEnabled',
  'waterfallEnabled',
] as const;

export type ValidGovernanceFlag = (typeof VALID_GOVERNANCE_FLAGS)[number];
