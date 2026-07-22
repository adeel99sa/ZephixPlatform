/**
 * In-page empty state when a workspace-scoped route has no active workspace.
 * Replaces silent redirects to /inbox — user stays on the URL they clicked.
 * Pattern matches HomeEmptyState: explain + picker, no workspace-scoped API
 * calls until a workspace is selected.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { listWorkspaces, type Workspace } from "@/features/workspaces/api";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import { canCreateOrgWorkspace } from "@/utils/access";

function titleForPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/capacity" || p.startsWith("/capacity/")) {
    return "Select a workspace to view capacity";
  }
  if (p === "/heatmap" || p.includes("/heatmap")) {
    return "Select a workspace to view the workload heatmap";
  }
  if (p === "/scenarios" || p.startsWith("/scenarios/")) {
    return "Select a workspace to view scenarios";
  }
  if (p.includes("/programs")) {
    return "Select a workspace to view programs";
  }
  if (p.includes("/portfolios")) {
    return "Select a workspace to view portfolios";
  }
  if (p === "/analytics" || p.startsWith("/analytics/")) {
    return "Select a workspace to view analytics";
  }
  if (p === "/resources" || p.startsWith("/resources/")) {
    return "Select a workspace to view resources";
  }
  return "Select a workspace to continue";
}

export function WorkspaceRequiredEmptyState(): JSX.Element {
  const location = useLocation();
  const { user } = useAuth();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const showCreate = canCreateOrgWorkspace(user);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const title = useMemo(() => titleForPath(location.pathname), [location.pathname]);

  const sorted = useMemo(
    () => [...workspaces].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [workspaces],
  );

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const list = await listWorkspaces();
      setWorkspaces(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load workspaces";
      setError(message);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectWorkspace = (workspaceId: string): void => {
    if (!workspaceId) return;
    setActiveWorkspace(workspaceId);
    try {
      localStorage.setItem("zephix.lastWorkspaceId", workspaceId);
    } catch {
      // non-blocking
    }
    // Stay on the current route — RequireWorkspace will re-render Outlet.
  };

  return (
    <div className="p-6" data-testid="workspace-required-empty">
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">
            This page needs a workspace. Select one below to continue — you will stay on this page.
          </p>
        </div>

        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700"
            role="alert"
          >
            {error}
            <div className="mt-2">
              <Button type="button" variant="ghost" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 text-left">
          {loading ? (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              Loading workspaces…
            </div>
          ) : null}

          {!loading && sorted.length === 0 ? (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              No workspaces found.
            </div>
          ) : null}

          {sorted.map((w) => (
            <button
              key={w.id}
              type="button"
              data-testid={`workspace-required-pick-${w.id}`}
              onClick={() => selectWorkspace(w.id)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="text-sm font-medium text-slate-900">{w.name}</div>
              {w.description ? (
                <div className="mt-0.5 text-xs text-slate-500">{w.description}</div>
              ) : null}
            </button>
          ))}
        </div>

        {showCreate ? (
          <div className="flex justify-center">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(true)}>
              Create workspace
            </Button>
          </div>
        ) : null}
      </div>

      {createOpen ? (
        <WorkspaceCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(workspaceId) => {
            setCreateOpen(false);
            if (workspaceId) selectWorkspace(workspaceId);
            else void load();
          }}
        />
      ) : null}
    </div>
  );
}
