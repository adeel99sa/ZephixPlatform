/** localStorage helpers for sidebar project artifact tree expansion (Sprint 5.2a). */

export function projectExpansionStorageKey(userId: string | undefined): string {
  return `zephix-sidebar-project-expansion-${userId ?? 'guest'}`;
}

export function readExpandedProjectIds(storageKey: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function writeExpandedProjectIds(storageKey: string, map: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(map));
}
