import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";

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

  if (!activeWorkspaceId) {
    const intended = location.pathname + location.search;
    return <Navigate to={`/home?next=${encodeURIComponent(intended)}`} replace />;
  }

  return <Outlet />;
}
