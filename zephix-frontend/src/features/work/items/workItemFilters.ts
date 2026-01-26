export type WorkItemStatusFilter =
  | "active"
  | "at_risk"
  | "blocked"
  | "completed"
  | "all";

export type WorkItemAssigneeFilter = "me" | "any";

export type WorkItemDateRangeFilter =
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "this_quarter"
  | "all_time";

export type WorkItemHealthFilter =
  | "on_track"
  | "at_risk"
  | "blocked";

export type WorkItemFilters = {
  workspaceId?: string;
  status?: WorkItemStatusFilter;
  assignee?: WorkItemAssigneeFilter;
  dateRange?: WorkItemDateRangeFilter;
  health?: WorkItemHealthFilter[];
};

const KEY = {
  workspaceId: "workspaceId",
  status: "status",
  assignee: "assignee",
  dateRange: "dateRange",
  health: "health",
} as const;

const STATUS: WorkItemStatusFilter[] = [
  "active",
  "at_risk",
  "blocked",
  "completed",
  "all",
];

const ASSIGNEE: WorkItemAssigneeFilter[] = ["me", "any"];

const DATE_RANGE: WorkItemDateRangeFilter[] = [
  "last_7_days",
  "last_30_days",
  "this_month",
  "this_quarter",
  "all_time",
];

const HEALTH: WorkItemHealthFilter[] = ["on_track", "at_risk", "blocked"];

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}

export function parseWorkItemFilters(search: string): WorkItemFilters {
  const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  const workspaceIdRaw = sp.get(KEY.workspaceId) || undefined;
  const statusRaw = sp.get(KEY.status) || undefined;
  const assigneeRaw = sp.get(KEY.assignee) || undefined;
  const dateRangeRaw = sp.get(KEY.dateRange) || undefined;
  const healthRaw = sp.getAll(KEY.health);

  const filters: WorkItemFilters = {};

  if (workspaceIdRaw && workspaceIdRaw.trim().length > 0) {
    filters.workspaceId = workspaceIdRaw.trim();
  }

  if (statusRaw && isOneOf(statusRaw, STATUS)) {
    filters.status = statusRaw;
  }

  if (assigneeRaw && isOneOf(assigneeRaw, ASSIGNEE)) {
    filters.assignee = assigneeRaw;
  }

  if (dateRangeRaw && isOneOf(dateRangeRaw, DATE_RANGE)) {
    filters.dateRange = dateRangeRaw;
  }

  const health: WorkItemHealthFilter[] = [];
  for (const h of healthRaw) {
    if (isOneOf(h, HEALTH) && !health.includes(h)) health.push(h);
  }
  if (health.length > 0) filters.health = health;

  return filters;
}

export function buildWorkItemSearch(filters: WorkItemFilters): string {
  const sp = new URLSearchParams();

  if (filters.workspaceId) sp.set(KEY.workspaceId, filters.workspaceId);
  if (filters.status) sp.set(KEY.status, filters.status);
  if (filters.assignee) sp.set(KEY.assignee, filters.assignee);
  if (filters.dateRange) sp.set(KEY.dateRange, filters.dateRange);

  if (filters.health && filters.health.length > 0) {
    for (const h of filters.health) sp.append(KEY.health, h);
  }

  const s = sp.toString();
  return s.length > 0 ? `?${s}` : "";
}

export function hasAnyFilterKey(search: string): boolean {
  const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const k of Object.values(KEY)) {
    if (k === KEY.health) {
      if (sp.getAll(k).length > 0) return true;
      continue;
    }
    if (sp.has(k)) return true;
  }
  return false;
}

export function toMyWorkApiParams(filters: WorkItemFilters): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};

  if (filters.workspaceId) params.workspaceId = filters.workspaceId;
  if (filters.status) params.status = filters.status;
  if (filters.assignee) params.assignee = filters.assignee;
  if (filters.dateRange) params.dateRange = filters.dateRange;
  if (filters.health && filters.health.length > 0) params.health = filters.health;

  return params;
}
