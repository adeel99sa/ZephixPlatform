const LAST_ROUTE_KEY = "zephix.lastVisitedRoute.v1";
const RECENT_ROUTES_KEY = "zephix.recentVisitedRoutes.v1";
const RECENT_ENTITIES_KEY = "zephix.recentVisitedEntities.v1";
const MAX_RECENT_ROUTES = 30;

const EXCLUDED_PREFIXES = ["/login", "/signup", "/verify-email", "/invite"];
const EXCLUDED_EXACT = new Set([
  "/",
  "/onboarding",
  "/404",
  "/403",
  "/join/workspace",
]);

function isSafeLocalRoute(route: string): boolean {
  if (!route || typeof route !== "string") return false;
  if (!route.startsWith("/")) return false;
  if (route.startsWith("//")) return false;
  if (EXCLUDED_EXACT.has(route)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => route.startsWith(prefix))) return false;
  return true;
}

export type RecentVisitedEntity = {
  route: string;
  entityType: "workspace" | "portfolio" | "program" | "project" | "route";
  entityId: string;
  workspaceId?: string;
  label: string;
  ts: number;
};

function parseEntityFromRoute(
  route: string,
  activeWorkspaceId?: string | null,
): RecentVisitedEntity {
  const now = Date.now();
  const workspaceMatch = route.match(/^\/workspaces\/([^/?#]+)/);
  if (workspaceMatch) {
    const workspaceId = workspaceMatch[1];
    return {
      route,
      entityType: "workspace",
      entityId: workspaceId,
      workspaceId,
      label: `Workspace ${workspaceId.slice(0, 8)}`,
      ts: now,
    };
  }
  const projectMatch = route.match(/^\/projects\/([^/?#]+)/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    return {
      route,
      entityType: "project",
      entityId: projectId,
      workspaceId: activeWorkspaceId ?? undefined,
      label: `Project ${projectId.slice(0, 8)}`,
      ts: now,
    };
  }
  return {
    route,
    entityType: "route",
    entityId: route,
    workspaceId: activeWorkspaceId ?? undefined,
    label: route,
    ts: now,
  };
}

export function persistLastVisitedRoute(
  route: string,
  activeWorkspaceId?: string | null,
): void {
  if (!isSafeLocalRoute(route)) return;
  try {
    localStorage.setItem(LAST_ROUTE_KEY, route);
    const raw = localStorage.getItem(RECENT_ROUTES_KEY);
    const current: string[] = raw ? JSON.parse(raw) : [];
    const normalized = Array.isArray(current)
      ? current.filter((entry) => typeof entry === "string" && isSafeLocalRoute(entry))
      : [];
    const next = [route, ...normalized.filter((entry) => entry !== route)].slice(
      0,
      MAX_RECENT_ROUTES,
    );
    localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));

    const entity = parseEntityFromRoute(route, activeWorkspaceId);
    const entityRaw = localStorage.getItem(RECENT_ENTITIES_KEY);
    const entityCurrent: unknown = entityRaw ? JSON.parse(entityRaw) : [];
    const normalizedEntities = Array.isArray(entityCurrent)
      ? entityCurrent.filter(
          (entry): entry is RecentVisitedEntity =>
            Boolean(
              entry &&
                typeof entry === "object" &&
                typeof (entry as RecentVisitedEntity).route === "string" &&
                isSafeLocalRoute((entry as RecentVisitedEntity).route) &&
                typeof (entry as RecentVisitedEntity).entityType === "string" &&
                typeof (entry as RecentVisitedEntity).entityId === "string",
            ),
        )
      : [];
    const entityNext = [
      entity,
      ...normalizedEntities.filter((entry) => entry.route !== route),
    ].slice(0, MAX_RECENT_ROUTES);
    localStorage.setItem(RECENT_ENTITIES_KEY, JSON.stringify(entityNext));
  } catch {
    // Best effort only.
  }
}

export function readLastVisitedRoute(): string | null {
  try {
    const route = localStorage.getItem(LAST_ROUTE_KEY);
    return route && isSafeLocalRoute(route) ? route : null;
  } catch {
    return null;
  }
}

export function readRecentVisitedRoutes(limit = 10): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ROUTES_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .filter((entry) => isSafeLocalRoute(entry))
      .slice(0, Math.max(0, limit));
  } catch {
    return [];
  }
}

export function readRecentVisitedEntities(options?: {
  workspaceId?: string | null;
  limit?: number;
}): RecentVisitedEntity[] {
  const limit = Math.max(0, options?.limit ?? 10);
  const workspaceId = options?.workspaceId ?? null;
  try {
    const raw = localStorage.getItem(RECENT_ENTITIES_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const entities = value.filter(
      (entry): entry is RecentVisitedEntity =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            typeof (entry as RecentVisitedEntity).route === "string" &&
            typeof (entry as RecentVisitedEntity).entityType === "string" &&
            typeof (entry as RecentVisitedEntity).entityId === "string" &&
            isSafeLocalRoute((entry as RecentVisitedEntity).route),
        ),
    );
    return entities
      .filter((entry) => !workspaceId || !entry.workspaceId || entry.workspaceId === workspaceId)
      .slice(0, limit);
  } catch {
    return [];
  }
}

