import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useWorkspaceStore } from "@/state/workspace.store";
import { PageHeader } from "@/ui/components/PageHeader";
import { WorkspaceTabBar } from "./WorkspaceTabBar";

export function WorkspaceLayout() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { activeWorkspaceName, setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (workspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [workspaceId, setActiveWorkspace]);

  // No inline fallback — use explicit routed 404
  if (!workspaceId) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <PageHeader
          title={activeWorkspaceName || "Workspace"}
          subtitle="Operational surface for team delivery"
          className="border-none px-0 py-0 shadow-none"
        />
      </div>
      <WorkspaceTabBar workspaceId={workspaceId} />
      <div className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

