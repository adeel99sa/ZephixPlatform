/**
 * WC-001: Map backend TaskActivityType strings to user-facing phrases.
 * @see docs/architecture/wave0-contract-changes.md
 */

/** Short verb phrase for workspace-home / dashboard activity lines. */
export function taskActivityPhrase(type: string): string {
  switch (type) {
    case 'TASK_CREATED':
      return 'created';
    case 'TASK_STATUS_CHANGED':
      return 'changed status of';
    case 'TASK_ASSIGNED':
      return 'assigned';
    case 'TASK_UNASSIGNED':
      return 'unassigned';
    case 'TASK_COMMENT_ADDED':
      return 'commented on';
    case 'TASK_COMMENT_EDITED':
      return 'edited a comment on';
    case 'TASK_COMMENT_DELETED':
      return 'deleted a comment on';
    case 'TASK_UPDATED':
      return 'updated';
    case 'TASK_DELETED':
      return 'deleted';
    case 'TASK_RESTORED':
      return 'restored';
    case 'DEPENDENCY_ADDED':
      return 'added a dependency on';
    case 'DEPENDENCY_REMOVED':
      return 'removed a dependency on';
    case 'TASK_WIP_OVERRIDE':
      return 'overrode WIP limit on';
    case 'TASK_ACCEPTANCE_CRITERIA_UPDATED':
      return 'updated acceptance criteria on';
    case 'GATE_APPROVAL_STEP_APPROVED':
      return 'approved a gate step on';
    case 'GATE_APPROVAL_STEP_REJECTED':
      return 'rejected a gate step on';
    case 'GATE_APPROVAL_CHAIN_COMPLETED':
      return 'completed a gate approval on';
    default:
      return type.toLowerCase().replace(/_/g, ' ');
  }
}

/** Sentence for inline task activity feed (TaskListSection). */
export function formatTaskActivitySentence(
  type: string,
  actor: string,
  payload?: Record<string, unknown>,
): string {
  switch (type) {
    case 'TASK_CREATED':
      return `${actor} created this task`;
    case 'TASK_STATUS_CHANGED': {
      const from = payload?.from ?? 'unknown';
      const to = payload?.to ?? 'unknown';
      return `${actor} changed status from ${from} to ${to}`;
    }
    case 'TASK_ASSIGNED':
      return `${actor} assigned this task`;
    case 'TASK_UNASSIGNED':
      return `${actor} unassigned this task`;
    case 'TASK_COMMENT_ADDED':
      return `${actor} added a comment`;
    case 'TASK_COMMENT_EDITED':
      return `${actor} edited a comment`;
    case 'TASK_COMMENT_DELETED':
      return `${actor} deleted a comment`;
    case 'TASK_UPDATED':
      return `${actor} updated this task`;
    case 'TASK_DELETED':
      return `${actor} deleted this task`;
    case 'TASK_RESTORED':
      return `${actor} restored this task`;
    case 'GATE_APPROVAL_STEP_APPROVED': {
      const self =
        payload?.selfApproved === true
          ? ' — Self-approved (no separate approver)'
          : '';
      return `${actor} approved a gate step${self}`;
    }
    case 'GATE_APPROVAL_STEP_REJECTED':
      return `${actor} rejected a gate step`;
    case 'GATE_APPROVAL_CHAIN_COMPLETED':
      return `${actor} completed gate approval`;
    default:
      return `${actor} ${taskActivityPhrase(type)} this task`;
  }
}
