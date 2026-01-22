/**
 * Phase 5.1 Locked Copy Phrases
 *
 * These exact phrases must be used throughout Phase 5.1 UI.
 * Do not create variants or synonyms.
 */

export const PHASE5_1_COPY = {
  // Structure locking
  STRUCTURE_LOCKS: 'Structure locks when work starts',

  // Access control
  READ_ONLY_ACCESS: 'Read only access',

  // Health and status
  NEEDS_ATTENTION: 'Needs attention',
  ON_TRACK: 'On track',
  BLOCKED: 'Blocked',

  // Acknowledgement flow
  CONFIRMATION_REQUIRED: 'Confirmation required',
  CONFIRMATION_EXPIRED: 'Confirmation expired. Try again.',

  // Empty states
  SELECT_WORKSPACE: 'Select a workspace to continue.',
  NO_TEMPLATES_MATCH: 'No templates match. Try another work type.',
  NO_PHASES_EXIST: 'No phases exist for this project.',
  NO_TASKS_IN_PHASE: 'No tasks in this phase.',
  NO_ITEMS_NEED_ATTENTION: 'No items need attention at this time.',

  // Error messages (mapped from backend codes)
  WORKSPACE_REQUIRED: 'Select a workspace to continue.',
  FORBIDDEN_ROLE: 'Read only access',
  DELIVERY_OWNER_REQUIRED: 'Delivery owner must be set before starting work.',
  WORK_PLAN_ALREADY_INITIALIZED: 'Project already has a work plan.',
  WORK_PLAN_INVALID: 'No phases exist for this project.',
  LOCKED_PHASE_STRUCTURE: 'Project is active. Structure is locked.',
} as const;

