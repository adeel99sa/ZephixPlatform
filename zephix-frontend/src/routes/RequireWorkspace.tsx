import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";

function hasWorkspaceInPath(pathname: string): boolean {
  // Allow deep links that already carry workspace context in the URL.
  return /^\/workspaces\/[^/]+(?:\/.*)?$/.test(pathname);
}

/** Template Center and similar org routes pass workspaceId in the query string */
function hasWorkspaceInQuery(pathname: string, search: string): boolean {
  if (pathname !== "/templates") return false;
  try {
    return Boolean(new URLSearchParams(search).get("workspaceId"));
  } catch {
    return false;
  }
}

/**
 * Route guard: redirects to /home when no workspace is selected.
 *
 * Passes the intended route as ?next= so the workspace creation flow
 * can resume navigation after a workspace is created.
 *
 * Wrap workspace-scoped routes in this element:
 *   <Route element={<RequireWorkspace />}>
 *     <Route path="/projects" ... />
 *   </Route>
 *
 * /home is org-level and never requires a workspace.
 */
export default function RequireWorkspace() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const location = useLocation();

  if (
    !activeWorkspaceId &&
    (hasWorkspaceInPath(location.pathname) ||
      hasWorkspaceInQuery(location.pathname, location.search))
  ) {
    return <Outlet />;
  }

  if (!activeWorkspaceId) {
    const intended = location.pathname + location.search;
    return <Navigate to={`/home?next=${encodeURIComponent(intended)}`} replace />;
  }

  return <Outlet />;
}
