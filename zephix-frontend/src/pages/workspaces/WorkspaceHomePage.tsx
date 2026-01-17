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

      <div className="mt-6 rounded-lg border p-4">
        <div className="font-medium">No projects yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Create your first project from Template Center.
        </div>
        <Link className="mt-3 inline-block text-blue-600" to="/templates">
          Open Template Center
        </Link>
      </div>
    </div>
  );
}
