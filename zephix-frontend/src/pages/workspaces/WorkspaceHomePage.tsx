import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getWorkspace, getWorkspaceSummary, updateWorkspace, Workspace, WorkspaceSummary } from "@/features/workspaces/api";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { toast } from "sonner";
import { useWorkspaceVisitTracker } from "@/hooks/useWorkspaceVisitTracker";
import { useWorkspaceStore } from "@/state/workspace.store";
import { useTemplateCenterModalStore } from "@/state/templateCenterModal.store";

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams();
  const { setActiveWorkspace } = useWorkspaceStore();
  const openTemplateCenter = useTemplateCenterModalStore(
    (s) => s.openTemplateCenter,
  );
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
        <div className="text-lg font-semibold text-[#1F2937]">Workspace not found</div>
        <Link className="text-[#2F6FED]" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-[#6B7280]">Loading...</div>;
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-[#1F2937]">Error</div>
        <div className="mt-2 text-sm text-[#6B7280]">{err}</div>
        <button
          onClick={loadData}
          className="mt-4 rounded px-4 py-2 bg-[#2F6FED] text-white hover:bg-[#1F5EDC]"
        >
          Retry
        </button>
        <Link className="mt-4 ml-4 inline-block text-[#2F6FED]" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (!ws) {
    return <div className="p-6">Workspace not found</div>;
  }

  const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="space-y-4 p-6">
      <div>
        <div className="text-2xl font-semibold text-[#1F2937]">{ws.name}</div>
        <div className="mt-1 text-sm text-[#6B7280]">Workspace home</div>
      </div>

      {/* About Section */}
      <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-[#1F2937]">About</div>
          {isOwnerOrAdmin && !editingAbout && (
            <button
              onClick={() => setEditingAbout(true)}
              className="text-sm text-[#2F6FED] hover:text-[#1F5EDC]"
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
              className="w-full rounded border border-[#E2E6EA] p-2 text-sm"
              rows={3}
              placeholder="Add a short intro for your team"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveAbout}
                disabled={savingAbout}
                className="rounded bg-[#2F6FED] px-3 py-1 text-sm text-white hover:bg-[#1F5EDC] disabled:opacity-50"
              >
                {savingAbout ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditingAbout(false);
                  setAboutText(ws.description || "");
                }}
                className="rounded border border-[#E2E6EA] px-3 py-1 text-sm hover:bg-[#F1F3F6]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#6B7280]">
            {ws.description || "Add a short intro for your team"}
          </div>
        )}
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
          <div className="mb-1 text-sm text-[#6B7280]">Total projects</div>
          <div className="text-2xl font-semibold text-[#1F2937]">{summary?.projectsTotal || 0}</div>
        </div>
        <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
          <div className="mb-1 text-sm text-[#6B7280]">Projects in progress</div>
          <div className="text-2xl font-semibold text-[#1F2937]">{summary?.projectsInProgress || 0}</div>
        </div>
        <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
          <div className="mb-1 text-sm text-[#6B7280]">Total tasks</div>
          <div className="text-2xl font-semibold text-[#1F2937]">{summary?.tasksTotal || 0}</div>
        </div>
        <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
          <div className="mb-1 text-sm text-[#6B7280]">Tasks completed</div>
          <div className="text-2xl font-semibold text-[#1F2937]">{summary?.tasksCompleted || 0}</div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
        <div className="mb-2 font-medium text-[#1F2937]">Projects</div>
        <div className="mt-4 text-center py-8">
          <div className="mb-4 text-sm text-[#6B7280]">
            No projects yet
          </div>
          <button
            type="button"
            className="inline-block rounded bg-[#2F6FED] px-4 py-2 text-white transition-colors hover:bg-[#1F5EDC]"
            onClick={() => workspaceId && openTemplateCenter(workspaceId)}
          >
            Browse Templates
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[#E2E6EA] bg-[#FFFFFF] p-4">
        <div className="mb-4 font-medium text-[#1F2937]">Quick Actions</div>
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
            className="rounded border border-[#E2E6EA] bg-[#F1F3F6] px-4 py-2 text-[#1F2937] transition-colors hover:bg-[#E2E6EA]"
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
            className="rounded border border-[#E2E6EA] bg-[#F1F3F6] px-4 py-2 text-[#1F2937] transition-colors hover:bg-[#E2E6EA]"
          >
            New form
          </button>
        </div>
      </div>
    </div>
  );
}
