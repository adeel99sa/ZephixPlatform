/**
 * Legacy tab ids that must not remain in columnConfig.visibleTabs.
 * Sprint 5.2a retired Risks + the dead project_artifacts shell tab.
 * TC-F2b: `documents` is first-class again (document_instances store) — do not strip it.
 */
const LEGACY_TAB_IDS = new Set(['risks', 'project_artifacts']);

/** Remove deprecated tab ids from columnConfig.visibleTabs. */
export function stripLegacyVisibleTabs(
  columnConfig?: Record<string, boolean | string[]> | null,
): Record<string, boolean | string[]> {
  const base = { ...(columnConfig ?? {}) };
  const raw = base.visibleTabs;
  if (!Array.isArray(raw)) return base;
  const filtered = raw.filter(
    (id): id is string => typeof id === 'string' && !LEGACY_TAB_IDS.has(id),
  );
  return { ...base, visibleTabs: filtered };
}

export function columnConfigHasLegacyTabs(
  columnConfig?: Record<string, boolean | string[]> | null,
): boolean {
  const raw = columnConfig?.visibleTabs;
  if (!Array.isArray(raw)) return false;
  return raw.some((id) => typeof id === 'string' && LEGACY_TAB_IDS.has(id));
}
