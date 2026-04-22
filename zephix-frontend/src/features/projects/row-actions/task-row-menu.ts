/**
 * Methodology-aware task row (⋮) menu configuration.
 *
 * WaterfallTable consumes this today; other project task tables can reuse the
 * same action ids and per-methodology groupings when they ship.
 */

import type { WorkTaskType } from '@/features/work-management/workTasks.api';
import { normalizeMethodologyKey } from '@/features/projects/columns/column-registry';

/** Stable ids for row menu entries — wire handlers in the table by id. */
export type TaskRowMenuActionId =
  | 'detail'
  | 'addSubtask'
  | 'addDependency'
  | 'convertToMilestone'
  | 'convertToEpic'
  | 'moveToPhase'
  | 'duplicate'
  | 'copyLink'
  | 'delete';

/** Normalized methodology keys for menu layout (not the full project template DSL). */
export type ProjectTaskTableMethodology =
  | 'waterfall'
  | 'kanban'
  | 'scrum'
  | 'agile'
  | 'hybrid'
  | 'generic';

export type TaskRowMenuGroup = readonly TaskRowMenuActionId[];

export const TASK_ROW_MENU_LABELS: Record<TaskRowMenuActionId, string> = {
  detail: 'Detail',
  addSubtask: 'Add sub-task',
  addDependency: 'Add dependency',
  convertToMilestone: 'Convert to milestone',
  convertToEpic: 'Convert to epic',
  moveToPhase: 'Move to phase',
  duplicate: 'Duplicate',
  copyLink: 'Copy link',
  delete: 'Delete',
};

/**
 * Toast copy for actions that are not wired to backend/API yet.
 * Table code should call these via `toast.message` (or similar) when the user picks the item.
 */
export const TASK_ROW_MENU_PLACEHOLDER_TOAST: Record<
  'addDependency' | 'convertToMilestone' | 'convertToEpic' | 'moveToPhase',
  string
> = {
  addDependency: 'Dependency linking from the task list is not available yet.',
  convertToMilestone: 'Convert to milestone is not available from the table yet.',
  convertToEpic: 'Convert to epic is not available from the table yet.',
  moveToPhase: 'Move to phase is not available from the table yet.',
};

export interface TaskRowMenuVisibilityContext {
  level: 0 | 1 | 2;
  isMilestone: boolean;
  type: WorkTaskType;
}

export function isTaskRowMenuActionVisible(
  action: TaskRowMenuActionId,
  ctx: TaskRowMenuVisibilityContext,
): boolean {
  if (action === 'addSubtask' && ctx.level >= 2) return false;
  if (action === 'convertToMilestone' && ctx.isMilestone) return false;
  if (action === 'convertToEpic' && ctx.type === 'EPIC') return false;
  return true;
}

/**
 * Maps API `project.methodology` to a row-menu bucket.
 * Unknown non-empty strings follow the same default as `getDefaultColumnsForMethodology`
 * (waterfall-shaped surface) so template codes do not silently pick the agile/epic menu.
 */
export function normalizeProjectMethodology(
  raw: string | null | undefined,
): ProjectTaskTableMethodology {
  const s = (raw ?? '').trim();
  if (!s) return 'generic';
  const k = normalizeMethodologyKey(s);
  if (k === 'waterfall') return 'waterfall';
  if (k === 'kanban') return 'kanban';
  if (k === 'scrum') return 'scrum';
  if (k === 'agile') return 'agile';
  if (k === 'hybrid') return 'hybrid';
  return 'waterfall';
}

/**
 * Menu groups: visual separator between each group in the dropdown.
 * Order within a group is declaration order.
 */
export const TASK_ROW_MENU_GROUPS_BY_METHODOLOGY: Record<
  ProjectTaskTableMethodology,
  readonly TaskRowMenuGroup[]
> = {
  waterfall: [
    ['detail', 'addSubtask', 'addDependency', 'convertToMilestone', 'moveToPhase'],
    ['duplicate', 'copyLink'],
    ['delete'],
  ],
  kanban: [
    ['detail', 'addSubtask', 'addDependency', 'convertToEpic'],
    ['duplicate', 'copyLink'],
    ['delete'],
  ],
  scrum: [
    ['detail', 'addSubtask', 'addDependency', 'convertToEpic'],
    ['duplicate', 'copyLink'],
    ['delete'],
  ],
  agile: [
    ['detail', 'addSubtask', 'addDependency', 'convertToEpic'],
    ['duplicate', 'copyLink'],
    ['delete'],
  ],
  hybrid: [
    [
      'detail',
      'addSubtask',
      'addDependency',
      'convertToMilestone',
      'convertToEpic',
      'moveToPhase',
    ],
    ['duplicate', 'copyLink'],
    ['delete'],
  ],
  generic: [
    ['detail', 'addSubtask', 'addDependency', 'convertToEpic'],
    ['duplicate', 'copyLink'],
    ['delete'],
  ],
};

export function getTaskRowMenuGroups(
  methodologyRaw: string | null | undefined,
): readonly TaskRowMenuGroup[] {
  const key = normalizeProjectMethodology(methodologyRaw);
  return TASK_ROW_MENU_GROUPS_BY_METHODOLOGY[key];
}
