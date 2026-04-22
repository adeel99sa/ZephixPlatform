import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { createDashboard } from "./api";
import { X } from "lucide-react";
import { track } from "@/lib/telemetry";

interface DashboardCreateModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Pass 3: Dashboard creation flow — locked spec.
 * Step 1: Name
 * Step 2: Source scope (workspace only for now — workspace is the only real scope)
 * Step 3: Create and route to empty dashboard shell
 */
export function DashboardCreateModal({ open, onClose }: DashboardCreateModalProps) {
  const navigate = useNavigate();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const dashboard = await createDashboard({
        name: name.trim(),
        visibility: "WORKSPACE",
        workspaceId: activeWorkspaceId || undefined,
      });

      track("dashboard.created", { dashboardId: dashboard.id, scope: "workspace" });
      navigate(`/dashboards/${dashboard.id}`);
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="dashboard-create-modal">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={handleClose} />

        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Create Dashboard</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              data-testid="modal-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Step 1: Name */}
            <div>
              <label htmlFor="dashboard-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Dashboard name
              </label>
              <input
                id="dashboard-name"
                data-testid="dashboard-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Health Overview"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                required
              />
            </div>

            {/* Step 2: Source scope — workspace is the only real scope */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Source scope
              </label>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-sm font-medium text-slate-800">Workspace</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Dashboard cards will pull data from the active workspace.
                </p>
              </div>
            </div>

            {!activeWorkspaceId && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  Select a workspace in the sidebar first. The dashboard will be scoped to that workspace.
                </p>
              </div>
            )}

            {/* Step 3: Create */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="dashboard-submit"
                disabled={!name.trim() || loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? "Creating..." : "Create Dashboard"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
