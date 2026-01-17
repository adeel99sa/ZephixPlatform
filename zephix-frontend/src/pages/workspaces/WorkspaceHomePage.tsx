import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getWorkspace, Workspace } from "@/features/workspaces/api";
import { useAuth } from "@/state/AuthContext";

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams();
  const { setActiveWorkspaceId } = useAuth();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    setActiveWorkspaceId(workspaceId);

    getWorkspace(workspaceId)
      .then(setWs)
      .catch((e) => {
        setErr(e?.message || "Workspace not found");
      });
  }, [workspaceId, setActiveWorkspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Workspace not found</div>
        <Link className="text-blue-600" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">Workspace not found</div>
        <div className="mt-2 text-sm text-muted-foreground">{err}</div>
        <Link className="mt-4 inline-block text-blue-600" to="/workspaces">Back to workspaces</Link>
      </div>
    );
  }

  if (!ws) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="text-2xl font-semibold">{ws.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">Workspace home</div>

      {/* About Section */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="font-medium mb-2">About</div>
        <div className="text-sm text-muted-foreground">
          Add a short intro for your team
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Projects in progress</div>
          <div className="text-2xl font-semibold">0</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Tasks in progress</div>
          <div className="text-2xl font-semibold">0</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground mb-1">Tasks completed</div>
          <div className="text-2xl font-semibold">0</div>
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
    </div>
  );
}
