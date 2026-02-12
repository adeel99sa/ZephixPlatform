// ─────────────────────────────────────────────────────────────────────────────
// Integration V1 Event Labels — Step 22.6
// Human-readable labels for the events we support in v1.
// ─────────────────────────────────────────────────────────────────────────────

export const INTEGRATION_V1_EVENT_LABELS: Record<string, string> = {
  PHASE_GATE_BLOCKED_TRANSITION: 'Phase gate blocked',
  PHASE_GATE_SUBMITTED: 'Phase gate submitted',
  TASK_ASSIGNED: 'Task assigned',
  TASK_SCHEDULE_DELAYED: 'Task schedule delayed',
  SPRINT_STARTED: 'Sprint started',
  SPRINT_COMPLETED: 'Sprint completed',
};
