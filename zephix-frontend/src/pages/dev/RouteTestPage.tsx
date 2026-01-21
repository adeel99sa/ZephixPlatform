import { useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import { listWorkspaces } from "@/features/workspaces/api";
import { useEffect, useState } from "react";
import type { Workspace } from "@/features/workspaces/types";

/**
 * Dev-only route test page
 * Shows current routing state for debugging
 */
export default function RouteTestPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    if (activeWorkspaceId) {
      listWorkspaces().then((workspaces) => {
        const ws = Array.isArray(workspaces) ? workspaces : [];
        const found = ws.find((w) => w.id === activeWorkspaceId);
        setCurrentWorkspace(found || null);
      });
    } else {
      setCurrentWorkspace(null);
    }
  }, [activeWorkspaceId]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Route Test Page (Dev Only)</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="font-semibold mb-2">Current Pathname</h2>
          <code className="text-sm">{location.pathname}</code>
        </div>

        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="font-semibold mb-2">Active Workspace ID</h2>
          <code className="text-sm">{activeWorkspaceId || "None"}</code>
        </div>

        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="font-semibold mb-2">Current Workspace Slug</h2>
          <code className="text-sm">{currentWorkspace?.slug || "None"}</code>
        </div>

        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="font-semibold mb-2">User Role</h2>
          <div className="space-y-1">
            <div>
              <span className="text-sm text-gray-600">Platform Role:</span>{" "}
              <code className="text-sm">{user?.platformRole || "None"}</code>
            </div>
            <div>
              <span className="text-sm text-gray-600">Legacy Role:</span>{" "}
              <code className="text-sm">{user?.role || "None"}</code>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded border">
          <h2 className="font-semibold mb-2">User Email</h2>
          <code className="text-sm">{user?.email || "Not logged in"}</code>
        </div>
      </div>
    </div>
  );
}
