/**
 * Universal column keys for project task tables (Activities / unified table).
 * Map to `WorkTask` in workTasks.api.ts; naming matches UI — e.g. `taskType` ↔ `type`,
 * `storyPoints` ↔ `estimatePoints`, `dateDone` ↔ `completedAt`.
 */
export type ProjectColumnKey =
  | 'title'
  | 'assignee'
  | 'status'
  | 'priority'
  | 'startDate'
  | 'dueDate'
  | 'duration'
  | 'completion'
  | 'description'
  | 'remarks'
  | 'tags'
  | 'taskType'
  | 'estimateHours'
  | 'actualHours'
  | 'storyPoints'
  | 'sprint'
  | 'dateCreated'
  | 'dateUpdated'
  | 'dateDone'
  | 'dependencies'
  | 'parentTask'
  | 'approvalStatus'
  | 'documentRequired';

export interface ColumnDefinition {
  key: ProjectColumnKey;
  label: string;
  group: ColumnGroup;
  width: string;
  sortable: boolean;
  sortLabels?: [string, string];
  groupable: boolean;
  hideable: boolean;
  dataType:
    | 'text'
    | 'status'
    | 'priority'
    | 'person'
    | 'date'
    | 'number'
    | 'tags'
    | 'boolean'
    | 'relation';
  governanceOnly?: boolean;
  /**
   * True only when the Activities / Waterfall table renders a body cell for this column today.
   */
  cellRendererReady: boolean;
  /**
   * Fields panel: when true alongside `!cellRendererReady`, the row is listed as a first-class
   * field (no amber “Coming soon” badge). Checkbox stays disabled until the table body ships.
   */
  fieldsPanelSurfaceReady?: boolean;
}

export type ColumnGroup =
  | 'core'
  | 'assignment'
  | 'schedule'
  | 'detail'
  | 'tracking'
  | 'dates'
  | 'relationships'
  | 'governance';

export const COLUMN_GROUP_LABELS: Record<ColumnGroup, string> = {
  core: 'Core',
  assignment: 'Assignment & Status',
  schedule: 'Schedule',
  detail: 'Detail',
  tracking: 'Tracking',
  dates: 'Dates & Audit',
  relationships: 'Relationships',
  governance: 'Governance',
};

export type GroupingKey = ProjectColumnKey | 'phase';
