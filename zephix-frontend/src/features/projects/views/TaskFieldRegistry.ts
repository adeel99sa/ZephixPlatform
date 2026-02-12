/**
 * Task Field Registry — UX Step 3
 *
 * Frontend mirror of the backend task field definitions.
 * Single source of truth for field metadata in views.
 */

export type TaskFieldType = 'text' | 'enum' | 'date' | 'user' | 'relation' | 'number' | 'json';

export interface TaskFieldDef {
  key: string;
  label: string;
  type: TaskFieldType;
  isCore: boolean;
  sortable: boolean;
  groupable: boolean;
  editable: boolean;
  enumValues?: string[];
}

/* ------------------------------------------------------------------ */
/*  Core fields — always visible, cannot be hidden                     */
/* ------------------------------------------------------------------ */

export const CORE_TASK_FIELDS: TaskFieldDef[] = [
  { key: 'title', label: 'Title', type: 'text', isCore: true, sortable: true, groupable: false, editable: true },
  { key: 'status', label: 'Status', type: 'enum', isCore: true, sortable: true, groupable: true, editable: true, enumValues: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] },
  { key: 'assigneeUserId', label: 'Assignee', type: 'user', isCore: true, sortable: true, groupable: true, editable: true },
  { key: 'priority', label: 'Priority', type: 'enum', isCore: true, sortable: true, groupable: true, editable: true, enumValues: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  { key: 'dueDate', label: 'Due Date', type: 'date', isCore: true, sortable: true, groupable: false, editable: true },
];

/* ------------------------------------------------------------------ */
/*  Optional fields — togglable per view                               */
/* ------------------------------------------------------------------ */

export const OPTIONAL_TASK_FIELDS: TaskFieldDef[] = [
  { key: 'startDate', label: 'Start Date', type: 'date', isCore: false, sortable: true, groupable: false, editable: true },
  { key: 'phaseId', label: 'Phase', type: 'relation', isCore: false, sortable: true, groupable: true, editable: true },
  { key: 'sprintId', label: 'Sprint', type: 'relation', isCore: false, sortable: true, groupable: true, editable: true },
  { key: 'type', label: 'Type', type: 'enum', isCore: false, sortable: true, groupable: true, editable: true, enumValues: ['TASK', 'BUG', 'STORY', 'EPIC', 'MILESTONE', 'SUBTASK'] },
  { key: 'reporterUserId', label: 'Reporter', type: 'user', isCore: false, sortable: true, groupable: true, editable: true },
  { key: 'description', label: 'Description', type: 'text', isCore: false, sortable: false, groupable: false, editable: true },
  { key: 'tags', label: 'Tags', type: 'json', isCore: false, sortable: false, groupable: false, editable: true },
  { key: 'createdAt', label: 'Created', type: 'date', isCore: false, sortable: true, groupable: false, editable: false },
  { key: 'updatedAt', label: 'Updated', type: 'date', isCore: false, sortable: true, groupable: false, editable: false },
  { key: 'scheduleStatus', label: 'Schedule', type: 'enum', isCore: false, sortable: false, groupable: false, editable: false, enumValues: ['ON_TRACK', 'AT_RISK', 'DELAYED', 'AHEAD'] },
];

/* ------------------------------------------------------------------ */
/*  Combined + derived                                                 */
/* ------------------------------------------------------------------ */

export const ALL_TASK_FIELDS: TaskFieldDef[] = [
  ...CORE_TASK_FIELDS,
  ...OPTIONAL_TASK_FIELDS,
];

export const GROUPABLE_FIELDS = ALL_TASK_FIELDS.filter((f) => f.groupable);
export const SORTABLE_FIELDS = ALL_TASK_FIELDS.filter((f) => f.sortable);

/** Map from field key to definition */
export const FIELD_MAP = new Map(ALL_TASK_FIELDS.map((f) => [f.key, f]));

/**
 * Get the default visible fields for a given view type.
 */
export function getDefaultVisibleFields(viewType: string): string[] {
  const coreKeys = CORE_TASK_FIELDS.map((f) => f.key);
  switch (viewType) {
    case 'table':
      return [...coreKeys, 'startDate', 'phaseId', 'sprintId', 'type'];
    case 'list':
      return [...coreKeys, 'type'];
    case 'board':
      return [...coreKeys];
    case 'gantt':
      return [...coreKeys, 'startDate', 'phaseId'];
    default:
      return coreKeys;
  }
}
