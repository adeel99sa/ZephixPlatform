/**
 * @deprecated Use string literals or `DEFAULT_STATUS_KEYS` from
 * `entities/work-task.entity.ts`. Status is no longer a database-level
 * enum — `work_tasks.status` is now VARCHAR(50) and per-project status
 * definitions live in the `project_statuses` table. The enum is kept
 * exported so existing call sites that reference `TaskStatus.DONE` etc.
 * continue compiling; they resolve to the same string values.
 */
export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskType {
  TASK = 'TASK',
  EPIC = 'EPIC',
  MILESTONE = 'MILESTONE',
  BUG = 'BUG',
  STORY = 'STORY',
  SPIKE = 'SPIKE',
}

/**
 * Phase 5B.1 — Waterfall row-level approval status.
 *
 * `not_required` and `required` are intentionally distinct:
 *   - not_required = no approval needed for this row
 *   - required     = approval needed but not yet submitted
 *
 * Do NOT introduce `none` or `pending` aliases.
 */
export enum WorkTaskApprovalStatus {
  NOT_REQUIRED = 'not_required',
  REQUIRED = 'required',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

export enum TaskActivityType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_UNASSIGNED = 'TASK_UNASSIGNED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_RESTORED = 'TASK_RESTORED',
  TASK_COMMENT_ADDED = 'TASK_COMMENT_ADDED',
  TASK_COMMENT_EDITED = 'TASK_COMMENT_EDITED',
  TASK_COMMENT_DELETED = 'TASK_COMMENT_DELETED',
  DEPENDENCY_ADDED = 'DEPENDENCY_ADDED',
  DEPENDENCY_REMOVED = 'DEPENDENCY_REMOVED',
  TASK_WIP_OVERRIDE = 'TASK_WIP_OVERRIDE',
  TASK_ACCEPTANCE_CRITERIA_UPDATED = 'TASK_ACCEPTANCE_CRITERIA_UPDATED',
  /** Emitted when a task is moved out of a terminal (done/cancelled) status back to an open status. */
  TASK_REOPENED = 'TASK_REOPENED',
  // Sprint 10: Gate approval chain activity types
  GATE_APPROVAL_STEP_ACTIVATED = 'GATE_APPROVAL_STEP_ACTIVATED',
  GATE_APPROVAL_STEP_APPROVED = 'GATE_APPROVAL_STEP_APPROVED',
  GATE_APPROVAL_STEP_REJECTED = 'GATE_APPROVAL_STEP_REJECTED',
  GATE_APPROVAL_CHAIN_COMPLETED = 'GATE_APPROVAL_CHAIN_COMPLETED',
  GATE_APPROVAL_ESCALATED = 'GATE_APPROVAL_ESCALATED',
}
