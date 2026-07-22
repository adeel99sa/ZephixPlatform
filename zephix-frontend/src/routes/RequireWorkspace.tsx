import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";

import { WorkspaceRequiredEmptyState } from "@/routes/WorkspaceRequiredEmptyState";
import { useWorkspaceStore } from "@/state/workspace.store";

/**
 * `/w/:slug` and `/w/:slug/home` load workspace context from the slug and
 * populate `activeWorkspaceId` — they must not require a pre-selected workspace.
 */
function isWorkspaceSlugBootstrapPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  // Slug routes are exempt from activeWorkspaceId check — WorkspaceHomeBySlug (and
  // WorkspaceSlugRedirect → /home) resolve the workspace via GET /workspaces/slug/:slug/home
  // and set activeWorkspaceId on success. Removing this exemption breaks cold/deep links to /w/:slug/*.
  return /^\/w\/[^/]+$/.test(p) || /^\/w\/[^/]+\/home$/.test(p);
}

/**
 * Route gate for workspace-scoped surfaces.
 *
 * When no workspace is selected: render an in-page empty state with a picker
 * (HomeEmptyState pattern). Do NOT redirect to /inbox — the user stays on the
 * URL they opened and learns what is missing.
 *
 * Zustand persist hydration: the workspace store rehydrates from
 * localStorage on mount. During the initial sync render the store
 * may report activeWorkspaceId as null even though a value exists
 * in storage. We check the `_hasHydrated` flag (Zustand persist
 * middleware sets it after rehydration) to avoid a false empty state.
 * If not hydrated yet, we render nothing (brief flash).
 */
export default function RequireWorkspace() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const hasHydrated = useWorkspaceStore.persist?.hasHydrated?.() ?? true;
  const location = useLocation();

  if (!hasHydrated) return null;

  if (!activeWorkspaceId && !isWorkspaceSlugBootstrapPath(location.pathname)) {
    return <WorkspaceRequiredEmptyState />;
  }

  return <Outlet />;
}
