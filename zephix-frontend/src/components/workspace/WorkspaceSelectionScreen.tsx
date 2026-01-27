import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/state/AuthContext";
import { cleanupLegacyAuthStorage } from "@/auth/cleanupAuthStorage";
import { useWorkspaceStore } from "@/state/workspace.store";
import { listWorkspaces, type Workspace } from "@/features/workspaces/api";
import { WorkspaceCreateModal } from "@/features/workspaces/WorkspaceCreateModal";

type LoadState = "idle" | "loading" | "error";

export default function WorkspaceSelectionScreen() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...workspaces].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [workspaces]);

  const load = async () => {
    setState("loading");
    setError(null);
    try {
      const list = await listWorkspaces();
      setWorkspaces(Array.isArray(list) ? list : []);
      setState("idle");
    } catch (e: any) {
      setState("error");
      setError(e?.message || "Failed to load workspaces");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (state !== "idle") return;
    if (sorted.length !== 1) return;

    const w = sorted[0];
    if (!w?.id) return;

    setActiveWorkspace(w.id);
    try {
      localStorage.setItem("zephix.lastWorkspaceId", w.id);
    } catch {}
    navigate("/home", { replace: true });
  }, [state, sorted, setActiveWorkspace, navigate]);

  const handleSelectWorkspace = (w: Workspace) => {
    if (!w?.id) return;

    setActiveWorkspace(w.id);
    try {
      localStorage.setItem("zephix.lastWorkspaceId", w.id);
    } catch {}
    navigate("/home", { replace: true });
  };

  const handleLogout = async () => {
    try {
      await logout(); // This already calls cleanupLegacyAuthStorage
    } finally {
      localStorage.removeItem("zephix.activeWorkspaceId");
      navigate("/login", { replace: true });
    }
  };

  const onWorkspaceCreated = async () => {
    setCreateOpen(false);
    await load();

    const created = workspaces.find((w) => w.slug) || null;
    if (!created?.id) return;

    setActiveWorkspace(created.id);
    try {
      localStorage.setItem("zephix.lastWorkspaceId", created.id);
    } catch {}
    navigate("/home", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-xl items-center justify-center px-6 py-10">
      <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-xl font-semibold text-slate-900">Select workspace</div>
          <div className="mt-1 text-sm text-slate-500">Select a workspace to continue.</div>
        </div>

        {state === "error" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error || "Error"}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {state === "loading" && (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              Loading workspaces...
            </div>
          )}

          {state !== "loading" && sorted.length === 0 && (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
              No workspaces found.
            </div>
          )}

          {sorted.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => handleSelectWorkspace(w)}
              className="w-full rounded-lg border px-4 py-3 text-left hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-900">{w.name}</div>
              {w.description ? (
                <div className="mt-0.5 text-xs text-slate-500">{w.description}</div>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Create new workspace
          </button>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <WorkspaceCreateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={onWorkspaceCreated}
        />
      </div>
    </div>
  );
}
