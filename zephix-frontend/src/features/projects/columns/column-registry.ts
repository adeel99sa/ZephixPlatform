import type {
  ColumnDefinition,
  ColumnGroup,
  GroupingKey,
  ProjectColumnKey,
} from './column-types';

/**
 * Waterfall Activities table — data columns only (checkbox + ⋮ are separate cells).
 * WaterfallTable, CustomizeViewPanel, and keyboard/tab order must derive from this.
 */
export const WATERFALL_DATA_COLUMN_ORDER = [
  'title',
  'assignee',
  'status',
  'startDate',
  'dueDate',
  'completion',
  'duration',
  'remarks',
] as const satisfies readonly ProjectColumnKey[];

export type WaterfallDataColumnKey = (typeof WATERFALL_DATA_COLUMN_ORDER)[number];

export function isWaterfallDataColumnKey(k: string): k is WaterfallDataColumnKey {
  return (WATERFALL_DATA_COLUMN_ORDER as readonly string[]).includes(k);
}

/**
 * Master registry: labels, widths, sort/group flags. Single source for Fields panel and headers.
 */
export const COLUMN_REGISTRY: Record<ProjectColumnKey, ColumnDefinition> = {
  title: {
    key: 'title',
    label: 'Tasks',
    group: 'core',
    width: 'min-w-[200px] flex-1',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: false,
    hideable: false,
    dataType: 'text',
    cellRendererReady: true,
  },
  assignee: {
    key: 'assignee',
    label: 'Assignee',
    group: 'assignment',
    width: 'w-[160px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: true,
    hideable: true,
    dataType: 'person',
    cellRendererReady: true,
  },
  status: {
    key: 'status',
    label: 'Status',
    group: 'assignment',
    width: 'w-[140px]',
    sortable: true,
    sortLabels: ['Sort by Status Order', 'Sort by Status Order'],
    groupable: true,
    hideable: true,
    dataType: 'status',
    cellRendererReady: true,
  },
  priority: {
    key: 'priority',
    label: 'Priority',
    group: 'assignment',
    width: 'w-[120px]',
    sortable: true,
    sortLabels: ['High → Low', 'Low → High'],
    groupable: true,
    hideable: true,
    dataType: 'priority',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  startDate: {
    key: 'startDate',
    label: 'Start date',
    group: 'schedule',
    width: 'w-[130px]',
    sortable: true,
    sortLabels: ['Newest First', 'Oldest First'],
    groupable: false,
    hideable: true,
    dataType: 'date',
    cellRendererReady: true,
  },
  dueDate: {
    key: 'dueDate',
    label: 'Due date',
    group: 'schedule',
    width: 'w-[130px]',
    sortable: true,
    sortLabels: ['Newest First', 'Oldest First'],
    groupable: false,
    hideable: true,
    dataType: 'date',
    cellRendererReady: true,
  },
  duration: {
    key: 'duration',
    label: 'Duration (days)',
    group: 'schedule',
    width: 'w-[110px]',
    sortable: true,
    sortLabels: ['High → Low', 'Low → High'],
    groupable: false,
    hideable: true,
    dataType: 'number',
    cellRendererReady: true,
  },
  completion: {
    key: 'completion',
    label: 'Completion',
    group: 'schedule',
    width: 'w-[140px]',
    sortable: true,
    sortLabels: ['High → Low', 'Low → High'],
    groupable: false,
    hideable: true,
    dataType: 'number',
    cellRendererReady: true,
  },
  description: {
    key: 'description',
    label: 'Description',
    group: 'detail',
    width: 'w-[200px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: false,
    hideable: true,
    dataType: 'text',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  remarks: {
    key: 'remarks',
    label: 'Remarks',
    group: 'detail',
    width: 'w-[200px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: false,
    hideable: true,
    dataType: 'text',
    cellRendererReady: true,
  },
  tags: {
    key: 'tags',
    label: 'Tags',
    group: 'detail',
    width: 'w-[150px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: false,
    hideable: true,
    dataType: 'tags',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  taskType: {
    key: 'taskType',
    label: 'Task Type',
    group: 'detail',
    width: 'w-[120px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: true,
    hideable: true,
    dataType: 'text',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  estimateHours: {
    key: 'estimateHours',
    label: 'Estimate Hours',
    group: 'tracking',
    width: 'w-[110px]',
    sortable: true,
    sortLabels: ['High → Low', 'Low → High'],
    groupable: false,
    hideable: true,
    dataType: 'number',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  actualHours: {
    key: 'actualHours',
    label: 'Actual Hours',
    group: 'tracking',
    width: 'w-[110px]',
    sortable: true,
    sortLabels: ['High → Low', 'Low → High'],
    groupable: false,
    hideable: true,
    dataType: 'number',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  storyPoints: {
    key: 'storyPoints',
    label: 'Story Points',
    group: 'tracking',
    width: 'w-[100px]',
    sortable: true,
    sortLabels: ['High → Low', 'Low → High'],
    groupable: false,
    hideable: true,
    dataType: 'number',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  sprint: {
    key: 'sprint',
    label: 'Sprint',
    group: 'tracking',
    width: 'w-[120px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: true,
    hideable: true,
    dataType: 'text',
    cellRendererReady: true,
    fieldsPanelSurfaceReady: true,
  },
  dateCreated: {
    key: 'dateCreated',
    label: 'Date Created',
    group: 'dates',
    width: 'w-[130px]',
    sortable: true,
    sortLabels: ['Newest First', 'Oldest First'],
    groupable: false,
    hideable: true,
    dataType: 'date',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  dateUpdated: {
    key: 'dateUpdated',
    label: 'Date Updated',
    group: 'dates',
    width: 'w-[130px]',
    sortable: true,
    sortLabels: ['Newest First', 'Oldest First'],
    groupable: false,
    hideable: true,
    dataType: 'date',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  dateDone: {
    key: 'dateDone',
    label: 'Date Done',
    group: 'dates',
    width: 'w-[130px]',
    sortable: true,
    sortLabels: ['Newest First', 'Oldest First'],
    groupable: false,
    hideable: true,
    dataType: 'date',
    cellRendererReady: false,
    fieldsPanelSurfaceReady: true,
  },
  dependencies: {
    key: 'dependencies',
    label: 'Dependencies',
    group: 'relationships',
    width: 'w-[140px]',
    sortable: false,
    groupable: false,
    hideable: true,
    dataType: 'relation',
    cellRendererReady: false,
  },
  parentTask: {
    key: 'parentTask',
    label: 'Parent Task',
    group: 'relationships',
    width: 'w-[160px]',
    sortable: false,
    groupable: false,
    hideable: true,
    dataType: 'relation',
    cellRendererReady: false,
  },
  approvalStatus: {
    key: 'approvalStatus',
    label: 'Approval Status',
    group: 'governance',
    width: 'w-[140px]',
    sortable: true,
    sortLabels: ['A → Z', 'Z → A'],
    groupable: true,
    hideable: true,
    dataType: 'status',
    governanceOnly: true,
    cellRendererReady: false,
  },
  documentRequired: {
    key: 'documentRequired',
    label: 'Document Required',
    group: 'governance',
    width: 'w-[140px]',
    sortable: true,
    sortLabels: ['Yes First', 'No First'],
    groupable: false,
    hideable: true,
    dataType: 'boolean',
    governanceOnly: true,
    cellRendererReady: false,
  },
};

/** Column group order in Customize View → Fields (optional + hidden subsections). */
export const FIELD_TAB_GROUP_ORDER: ColumnGroup[] = [
  'core',
  'assignment',
  'schedule',
  'detail',
  'tracking',
  'dates',
  'relationships',
  'governance',
];

/** Registry keys not in the eight-column Waterfall data set (Customize optional pool). */
export function getWaterfallFieldsOptionalKeys(): ProjectColumnKey[] {
  const wf = new Set(WATERFALL_DATA_COLUMN_ORDER as readonly string[]);
  return (Object.keys(COLUMN_REGISTRY) as ProjectColumnKey[])
    .filter((k) => !wf.has(k))
    .sort((a, b) => {
      const ia = FIELD_TAB_GROUP_ORDER.indexOf(COLUMN_REGISTRY[a].group);
      const ib = FIELD_TAB_GROUP_ORDER.indexOf(COLUMN_REGISTRY[b].group);
      if (ia !== ib) return ia - ib;
      return COLUMN_REGISTRY[a].label.localeCompare(COLUMN_REGISTRY[b].label);
    });
}

/** Amber “Coming soon” in Fields optional rows — off when the column is a surfaced product field. */
export function shouldShowFieldsComingSoonBadge(def: ColumnDefinition): boolean {
  if (def.cellRendererReady) return false;
  if (def.fieldsPanelSurfaceReady) return false;
  return true;
}

const METHODOLOGY_ALIASES: Record<string, string> = {
  waterfall: 'waterfall',
  scrum: 'scrum',
  agile: 'agile',
  kanban: 'kanban',
  hybrid: 'hybrid',
};

/**
 * Default visible column sets per template/methodology key (lowercase).
 * Aligns with `project.methodology` style strings; unknown → waterfall.
 */
export const DEFAULT_COLUMNS: Record<string, ProjectColumnKey[]> = {
  waterfall: [...WATERFALL_DATA_COLUMN_ORDER],
  agile: [
    'title',
    'assignee',
    'status',
    'priority',
    'dueDate',
    'storyPoints',
    'tags',
  ],
  scrum: [
    'title',
    'assignee',
    'status',
    'priority',
    'dueDate',
    'storyPoints',
    'sprint',
  ],
  kanban: ['title', 'assignee', 'status', 'priority', 'tags', 'dueDate'],
  hybrid: [
    'title',
    'assignee',
    'status',
    'startDate',
    'dueDate',
    'completion',
    'duration',
    'storyPoints',
  ],
};

/** Default row grouping: phase rows vs status column, etc. */
export const DEFAULT_GROUPING: Record<string, GroupingKey> = {
  waterfall: 'phase',
  agile: 'status',
  scrum: 'status',
  kanban: 'status',
  hybrid: 'phase',
};

/** Default primary work surface per methodology (for future board/list routing). */
export type ProjectTasksDefaultView = 'list' | 'board';

export const DEFAULT_VIEW: Record<string, ProjectTasksDefaultView> = {
  waterfall: 'list',
  agile: 'board',
  scrum: 'board',
  kanban: 'board',
  hybrid: 'list',
};

/** Lowercase / alias-normalized methodology key (unknown strings pass through). */
export function normalizeMethodologyKey(methodology: string): string {
  const k = methodology.trim().toLowerCase();
  return METHODOLOGY_ALIASES[k] ?? k;
}

export function getDefaultColumnsForMethodology(
  methodology: string,
): ProjectColumnKey[] {
  const key = normalizeMethodologyKey(methodology);
  return DEFAULT_COLUMNS[key] ?? DEFAULT_COLUMNS.waterfall;
}

export function getDefaultGroupingForMethodology(
  methodology: string,
): GroupingKey {
  const key = normalizeMethodologyKey(methodology);
  return DEFAULT_GROUPING[key] ?? 'phase';
}

/**
 * Column keys that are "off" by default for a methodology: in registry, not
 * in the default visible set, excluding locked `title`.
 */
export function getHiddenColumnKeysForMethodology(
  methodology: string,
): ProjectColumnKey[] {
  const defaults = new Set(getDefaultColumnsForMethodology(methodology));
  return (Object.keys(COLUMN_REGISTRY) as ProjectColumnKey[]).filter(
    (col) => col !== 'title' && !defaults.has(col),
  );
}

/** Alias matching spec/docs — columns not in the methodology default visible set. */
export const getHiddenColumns = getHiddenColumnKeysForMethodology;
