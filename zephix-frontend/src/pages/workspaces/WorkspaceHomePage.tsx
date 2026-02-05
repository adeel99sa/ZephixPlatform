import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getWorkspace, getWorkspaceSummary, updateWorkspace, Workspace, WorkspaceSummary } from "@/features/workspaces/api";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { toast } from "sonner";
import { useWorkspaceVisitTracker } from "@/hooks/useWorkspaceVisitTracker";
import { useWorkspaceStore } from "@/state/workspace.store";

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

  // Track workspace visits for /home page
  useWorkspaceVisitTracker(
    ws && ws.slug
      ? { id: ws.id, slug: ws.slug, name: ws.name }
      : null
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
        <div className="text-lg font-semibold">Workspace not found</div>
        <Link className="text-blue-600" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Error</div>
        <div className="mt-2 text-sm text-muted-foreground">{err}</div>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
        <Link className="mt-4 ml-4 inline-block text-blue-600" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (!ws) {
    return <div className="p-6">Workspace not found</div>;
  }

  const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="p-6">
      <div className="text-2xl font-semibold">{ws.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">Workspace home</div>

      {/* About Section */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">About</div>
          {isOwnerOrAdmin && !editingAbout && (
            <button
              onClick={() => setEditingAbout(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>
        {editingAbout ? (
          <div className="space-y-2">
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              rows={3}
              placeholder="Add a short intro for your team"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveAbout}
                disabled={savingAbout}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {savingAbout ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingAbout(false);
                  setAboutText(ws.description || "");
                }}
                className="px-3 py-1 border text-sm rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {ws.description || "Add a short intro for your team"}
          </div>
        )}
      </div>

      {/* KPI Tiles */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Total projects</div>
          <div className="text-2xl font-semibold">{summary?.projectsTotal || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Projects in progress</div>
          <div className="text-2xl font-semibold">{summary?.projectsInProgress || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Total tasks</div>
          <div className="text-2xl font-semibold">{summary?.tasksTotal || 0}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Tasks completed</div>
          <div className="text-2xl font-semibold">{summary?.tasksCompleted || 0}</div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="font-medium mb-2">Projects</div>
        <div className="mt-4 text-center py-8">
          <div className="text-sm text-muted-foreground mb-4">
            No projects yet
          </div>
          <Link
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            to="/templates"
          >
            Open Template Center
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="font-medium mb-4">Quick Actions</div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (!workspaceId) {
                toast.error("Workspace ID required");
                return;
              }
              try {
                const { createDoc } = await import("@/features/docs/api");
                const docId = await createDoc(workspaceId, "Untitled");
                navigate(`/docs/${docId}`);
              } catch (e: any) {
                toast.error(e?.message || "Failed to create doc");
              }
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            New doc
          </button>
          <button
            onClick={async () => {
              if (!workspaceId) {
                toast.error("Workspace ID required");
                return;
              }
              try {
                const { createForm } = await import("@/features/forms/api");
                const formId = await createForm(workspaceId, "Untitled");
                navigate(`/forms/${formId}/edit`);
              } catch (e: any) {
                toast.error(e?.message || "Failed to create form");
              }
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            New form
          </button>
        </div>
      </div>
    </div>
  );
}
