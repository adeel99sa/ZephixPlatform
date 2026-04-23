/** Query keys shared across Activities / Board / Gantt toolbars (FilterBar uses the filter subset). */
export const WORK_SURFACE_QUERY = {
  taskQ: 'taskQ',
  myTasks: 'myTasks',
  hideDone: 'hideDone',
  groupBy: 'groupBy',
  sort: 'sort',
  sortDir: 'sortDir',
} as const;

/** Params owned by {@link FilterBar} — stripped on clear / merged on filter update. */
export const FILTER_PARAM_KEYS = [
  'status',
  'priority',
  'assigneeUserId',
  'phaseId',
  'type',
  'tags',
  'dueFrom',
  'dueTo',
] as const;
