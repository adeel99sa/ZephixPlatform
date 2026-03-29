import { ProjectGovernanceLevel } from '../types';

/**
 * Progressive project shell tabs — mirrors backend `project-shell-tabs.ts`.
 * @see zephix-backend/src/modules/projects/constants/project-shell-tabs.ts
 */
export const ALLOWED_PROJECT_SHELL_TAB_KEYS = [
  'overview',
  'tasks',
  'plan',
  'execution',
  'approvals',
  'raid',
  'reports',
  'documents',
] as const;

export type ProjectShellTabKey = (typeof ALLOWED_PROJECT_SHELL_TAB_KEYS)[number];

const ALLOWED = new Set<string>(ALLOWED_PROJECT_SHELL_TAB_KEYS);

/**
 * Filters to the allowlist, de-dupes, preserves first-seen order.
 * Falls back to default when the result would be empty.
 */
export function normalizeActiveTabsList(tabs: string[] | undefined | null): string[] {
  const list = Array.isArray(tabs) ? tabs : [];
  const out: string[] = [];
  for (const raw of list) {
    const k = String(raw).trim().toLowerCase();
    if (!ALLOWED.has(k) || out.includes(k)) {
      continue;
    }
    out.push(k);
  }
  return out.length > 0 ? out : ['overview', 'tasks'];
}

/** Route segment under `/projects/:projectId/:segment` */
export type ProjectShellRouteSegment =
  | 'overview'
  | 'plan'
  | 'execution'
  | 'approvals'
  | 'raid'
  | 'reports'
  | 'documents'
  | 'resources';

export interface ProjectShellTabNavItem {
  /** Allowlist key (for analytics / tests). */
  tabKey: string;
  /** URL segment (React Router path under project). */
  pathSegment: ProjectShellRouteSegment;
  label: string;
}

/** Human-readable tab names for progressive shell UI (6b add-tab menu). */
export const PROJECT_SHELL_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  tasks: 'Tasks',
  plan: 'Plan',
  execution: 'Execution',
  approvals: 'Approvals',
  raid: 'RAID',
  reports: 'Reports',
  documents: 'Documents',
};

const LABELS = PROJECT_SHELL_TAB_LABELS;

/**
 * Maps allowlist keys to URL segments. `tasks` and `execution` both use route `execution`
 * (see App.tsx — legacy `tasks` redirects there).
 */
export function tabKeyToPathSegment(key: string): ProjectShellRouteSegment {
  if (key === 'tasks' || key === 'execution') return 'execution';
  if (key === 'overview') return 'overview';
  if (key === 'plan') return 'plan';
  if (key === 'approvals') return 'approvals';
  if (key === 'raid') return 'raid';
  if (key === 'reports') return 'reports';
  if (key === 'documents') return 'documents';
  return 'overview';
}

/**
 * Builds nav items in allowlist order, deduping shared routes (`tasks` + `execution` → one item).
 */
export function buildProgressiveShellTabs(normalizedKeys: string[]): ProjectShellTabNavItem[] {
  const seenPath = new Set<ProjectShellRouteSegment>();
  const items: ProjectShellTabNavItem[] = [];

  for (const key of normalizedKeys) {
    const pathSegment = tabKeyToPathSegment(key);
    if (seenPath.has(pathSegment)) {
      continue;
    }
    seenPath.add(pathSegment);
    const label =
      pathSegment === 'execution' && key === 'execution'
        ? 'Execution'
        : pathSegment === 'execution'
          ? LABELS.tasks
          : LABELS[key] ?? key;
    items.push({ tabKey: key, pathSegment, label });
  }

  return items;
}

/** Whether the current route segment is enabled for the normalized tab keys. */
export function isShellRouteAllowed(
  routeSegment: string,
  normalizedKeys: string[],
): boolean {
  const allowedSegments = new Set(
    normalizedKeys.map((k) => tabKeyToPathSegment(k)),
  );
  return allowedSegments.has(routeSegment as ProjectShellRouteSegment);
}

/** Parses `/projects/:projectId/:segment` — returns null for `/projects/:id` only. */
export function parseProjectShellSegment(pathname: string): string | null {
  const m = pathname.match(/\/projects\/[^/]+\/([^/?#]+)/);
  return m?.[1] ?? null;
}

/** First path segment to redirect to when the current route is not allowed. */
export function firstAllowedPathSegment(normalizedKeys: string[]): ProjectShellRouteSegment {
  const items = buildProgressiveShellTabs(normalizedKeys);
  return items[0]?.pathSegment ?? 'overview';
}

/**
 * Whether the user may remove this tab key from `active_tabs`.
 * - `overview` and `tasks` are always mandatory.
 * - When {@link ProjectGovernanceLevel.GOVERNED}, `documents` and `raid` (risks) are mandatory.
 */
export function isProjectShellTabKeyRemovable(
  tabKey: string,
  governanceLevel: string | undefined | null,
): boolean {
  const k = String(tabKey).trim().toLowerCase();
  if (k === 'overview' || k === 'tasks') {
    return false;
  }
  if (governanceLevel === ProjectGovernanceLevel.GOVERNED) {
    if (k === 'documents' || k === 'raid') {
      return false;
    }
  }
  return true;
}
