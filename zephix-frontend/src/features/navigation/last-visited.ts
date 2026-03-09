const LAST_ROUTE_KEY = "zephix.lastVisitedRoute.v1";

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

export function persistLastVisitedRoute(route: string): void {
  if (!isSafeLocalRoute(route)) return;
  try {
    localStorage.setItem(LAST_ROUTE_KEY, route);
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

