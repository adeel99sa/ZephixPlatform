import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getWorkspace, getWorkspaceSummary, updateWorkspace, Workspace, WorkspaceSummary } from "@/features/workspaces/api";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { toast } from "sonner";
import { useWorkspaceVisitTracker } from "@/hooks/useWorkspaceVisitTracker";
import { useWorkspaceStore } from "@/state/workspace.store";
import { Plus, LayoutDashboard } from "lucide-react";

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams();
  const { setActiveWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const { role, canWrite } = useWorkspaceRole(workspaceId);
  const [ws, setWs] = useState<Workspace | null>(null);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setActiveWorkspace(workspaceId);
    loadData();
  }, [workspaceId, setActiveWorkspace]);

  useWorkspaceVisitTracker(
    ws && ws.slug ? { id: ws.id, slug: ws.slug, name: ws.name } : null
  );

  const loadData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [workspaceData, summaryData] = await Promise.all([
        getWorkspace(workspaceId!),
        getWorkspaceSummary(workspaceId!),
      ]);
      setWs(workspaceData);
      setSummary(summaryData);
      setAboutText(workspaceData.description || "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load workspace");
      toast.error("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbout = async () => {
    if (!workspaceId) return;
    setSavingAbout(true);
    try {
      const updated = await updateWorkspace(workspaceId, { description: aboutText });
      setWs(updated);
      setEditingAbout(false);
      toast.success("About section updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save about section");
    } finally {
      setSavingAbout(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-slate-900">Workspace not found</div>
        <Link className="text-blue-600" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-slate-900">Error</div>
        <div className="mt-2 text-sm text-slate-500">{err}</div>
        <button onClick={loadData} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  if (!ws) return <div className="p-6 text-slate-500">Workspace not found</div>;

  const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";
  const hasProjects = (summary?.projectsTotal ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6" data-testid="workspace-dashboard">
      {/* Dashboard header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{ws.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Workspace dashboard</p>
        </div>
        {isOwnerOrAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/dashboards")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              data-testid="ws-dashboard-manage"
            >
              <LayoutDashboard className="h-4 w-4" />
              Manage Dashboards
            </button>
          </div>
        )}
      </header>

      {/* About section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900">About</h2>
          {isOwnerOrAdmin && !editingAbout && (
            <button onClick={() => setEditingAbout(true)} className="text-xs text-blue-600 hover:text-blue-700">
              Edit
            </button>
          )}
        </div>
        {editingAbout ? (
          <div className="space-y-2">
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe this workspace for your team"
            />
            <div className="flex gap-2">
              <button onClick={handleSaveAbout} disabled={savingAbout}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {savingAbout ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setEditingAbout(false); setAboutText(ws.description || ""); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{ws.description || "Add a description for your team"}</p>
        )}
      </section>

      {/* KPI overview — real data from workspace summary, empty shells when no data */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiShell label="Projects" value={summary?.projectsTotal} hasData={hasProjects} />
          <KpiShell label="In Progress" value={summary?.projectsInProgress} hasData={hasProjects} />
          <KpiShell label="Tasks" value={summary?.tasksTotal} hasData={hasProjects} />
          <KpiShell label="Completed" value={summary?.tasksCompleted} hasData={hasProjects} />
        </div>
      </section>

      {/* Empty state guidance when no projects */}
      {!hasProjects && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">Dashboard cards will appear here</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Create a project from Template Center to start generating data. KPI cards will populate automatically as project data becomes available.
          </p>
          {isOwnerOrAdmin && (
            <Link
              to="/templates"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Create from Template
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function KpiShell({ label, value, hasData }: { label: string; value?: number; hasData: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
      {hasData ? (
        <div className="mt-1 text-2xl font-semibold text-slate-900">{value ?? 0}</div>
      ) : (
        <div className="mt-1 text-lg font-medium text-slate-300">&mdash;</div>
      )}
    </div>
  );
}
