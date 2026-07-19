/**
 * B9 — Project tab bar visibility from `project.columnConfig.visibleTabs`.
 */

export const TAB_ORDER = [
  'overview',
  'plan',
  'tasks',
  'board',
  'gantt',
  'table',
  'calendar',
  'documents',
] as const;

export type ProjectShellTabId = (typeof TAB_ORDER)[number];

/** Fallback when `visibleTabs` is missing (legacy projects). */
export const ALL_TAB_IDS: readonly string[] = [...TAB_ORDER];

export function tabOrderIndex(tabId: string): number {
  const idx = TAB_ORDER.indexOf(tabId as ProjectShellTabId);
  return idx === -1 ? TAB_ORDER.length : idx;
}

export function sortTabIdsByOrder(tabIds: string[]): string[] {
  return [...tabIds].sort((a, b) => tabOrderIndex(a) - tabOrderIndex(b));
}

export function readVisibleTabIds(
  columnConfig?: Record<string, boolean | string[]> | null,
): string[] {
  const raw = columnConfig?.visibleTabs;
  if (Array.isArray(raw) && raw.length > 0) {
    const known = new Set<string>(ALL_TAB_IDS);
    const filtered = raw.filter((id): id is string => typeof id === 'string' && known.has(id));
    if (filtered.length > 0) return sortTabIdsByOrder(filtered);
  }
  return [...ALL_TAB_IDS];
}

/** Views the + View popover can add (subset of shell tabs). */
export const ADDABLE_VIEW_TAB_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'plan', label: 'Plan' },
  { id: 'table', label: 'Table' },
  { id: 'gantt', label: 'Gantt' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'board', label: 'Board' },
  { id: 'tasks', label: 'Activities' },
  { id: 'documents', label: 'Documents' },
];
