import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";

/**
 * Route guard: redirects to Unified Home when no workspace is selected.
 *
 * Passes the intended route as ?next= so the workspace creation flow
 * can resume navigation after a workspace is created.
 *
 * Wrap workspace-scoped routes in this element:
 *   <Route element={<RequireWorkspace />}>
 *     <Route path="/projects" ... />
 *   </Route>
 *
 * Zustand persist hydration: the workspace store rehydrates from
 * localStorage on mount. During the initial sync render the store
 * may report activeWorkspaceId as null even though a value exists
 * in storage. We check the `_hasHydrated` flag (Zustand persist
 * middleware sets it after rehydration) to avoid false redirects.
 * If not hydrated yet, we render nothing (brief flash) rather than
 * redirecting to inbox.
 */
export default function RequireWorkspace() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const hasHydrated = useWorkspaceStore.persist?.hasHydrated?.() ?? true;
  const location = useLocation();

  // Wait for Zustand persist to rehydrate from localStorage before deciding.
  if (!hasHydrated) return null;

  if (!activeWorkspaceId) {
    const intended = location.pathname + location.search;
    return <Navigate to={`/inbox?next=${encodeURIComponent(intended)}`} replace />;
  }

  return <Outlet />;
}
