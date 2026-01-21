import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";

const ALLOWED_GLOBAL_PREFIXES = [
  "/home",
  "/dashboards",
  "/projects",
  "/template-center",
  "/resources",
  "/analytics",
  "/inbox",
  "/my-work",
  "/settings",
];

function shouldKeepWorkspaceContext(pathname: string) {
  if (pathname.startsWith("/w/")) return true;
  if (pathname.startsWith("/admin/") || pathname === "/admin") return true;
  return ALLOWED_GLOBAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * WorkspaceContextGuard
 * 
 * Clears activeWorkspaceId when navigating away from workspace-scoped pages
 * to prevent stale workspace context from affecting non-workspace pages.
 * 
 * Runtime invariant (dev only): Warns if /w/:slug path has no activeWorkspaceId
 * after initial render, indicating a routing/state mismatch.
 */
export function WorkspaceContextGuard() {
  const { pathname } = useLocation();
  const { activeWorkspaceId, clearActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (shouldKeepWorkspaceContext(pathname)) return;
    clearActiveWorkspace();
  }, [pathname, activeWorkspaceId, clearActiveWorkspace]);

  useEffect(() => {
    if (import.meta.env.MODE !== "development") return;
    if (!pathname.startsWith("/w/")) return;
    if (activeWorkspaceId) return;

    console.warn("[routing] /w/* without activeWorkspaceId. Select a workspace or fix slug route flow.", {
      pathname,
    });
  }, [pathname, activeWorkspaceId]);

  return null;
}
