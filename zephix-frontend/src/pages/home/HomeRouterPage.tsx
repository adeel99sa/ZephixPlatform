import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { LoadingScreen } from "../../components/common/LoadingScreen";
import { useAuth } from "../../state/AuthContext";
import { useWorkspaceRole } from "../../hooks/useWorkspaceRole";
import { useWorkspaceStore } from "../../state/workspace.store";
import { listWorkspaces } from "../../features/workspaces/api";
import WorkspaceSelectionScreen from "../../components/workspace/WorkspaceSelectionScreen";

const LAST_WORKSPACE_KEY = "zephix.lastWorkspaceId";

type Role = "admin" | "member" | "guest";

function normalizeRole(input: unknown): Role {
  const v = String(input || "").toLowerCase();
  // Map workspace roles to platform roles
  if (v === "owner" || v === "admin") return "admin";
  if (v === "member") return "member";
  return "guest";
}

function routeForRole(role: Role): string {
  // All roles go to /home - workspace selection happens there
  // If workspace is selected, redirect to workspace home route
  return "/home";
}

export default function HomeRouterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  // User existence determines authentication
  const isAuthenticatedValue = !!user;

  const {
    activeWorkspaceId,
    setActiveWorkspace,
  } = useWorkspaceStore();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  const { role: workspaceRole, loading: roleLoading } = useWorkspaceRole(activeWorkspaceId);

  const lastWorkspaceId = useMemo(() => {
    try {
      return localStorage.getItem(LAST_WORKSPACE_KEY) || "";
    } catch {
      return "";
    }
  }, []);

  // Fetch workspaces
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticatedValue || !user) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    const fetchWorkspaces = async () => {
      try {
        setWorkspacesLoading(true);
        const list = await listWorkspaces();
        setWorkspaces(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        setWorkspaces([]);
      } finally {
        setWorkspacesLoading(false);
      }
    };

    fetchWorkspaces();
  }, [authLoading, isAuthenticatedValue, user, navigate, location.pathname]);

  // Handle workspace resolution
  useEffect(() => {
    if (workspacesLoading) return;
    if (!isAuthenticatedValue || !user) return;

    if (!workspaces || workspaces.length === 0) {
      navigate("/onboarding", { replace: true });
      return;
    }

    // If workspace already selected, skip to redirect logic
    if (activeWorkspaceId) return;

    // Auto-select if only 1 workspace
    if (workspaces.length === 1) {
      const id = String((workspaces[0] as any).id || "");
      if (id) {
        setActiveWorkspace(id);
        try {
          localStorage.setItem(LAST_WORKSPACE_KEY, id);
        } catch {}
        return; // Will trigger workspace redirect effect
      }
    }

    // Try to restore last selected workspace
    if (lastWorkspaceId && workspaces.some((w: any) => String(w.id) === lastWorkspaceId)) {
      setActiveWorkspace(lastWorkspaceId);
      return; // Will trigger workspace redirect effect
    }

    // No workspace selected - stay on /home and show workspace selection UI
    // Don't redirect - let the component render the selection screen
  }, [
    workspacesLoading,
    isAuthenticatedValue,
    user,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    navigate,
    lastWorkspaceId,
  ]);

  // If workspace is selected, redirect to workspace home route
  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (roleLoading) return;

    // All roles go to workspace home route when workspace is selected
    // Find workspace slug from workspaces list
    const workspace = workspaces.find((w: any) => String(w.id) === String(activeWorkspaceId));
    if (workspace?.slug) {
      navigate(`/w/${workspace.slug}/home`, { replace: true });
    } else {
      // Fallback to ID-based route if slug not available
      navigate(`/workspaces/${activeWorkspaceId}/home`, { replace: true });
    }
  }, [activeWorkspaceId, roleLoading, workspaces, navigate]);

  const loading = authLoading || workspacesLoading || roleLoading;

  if (loading) return <LoadingScreen />;

  if (!user) return <LoadingScreen />;

  // If no workspace selected, show workspace selection UI on /home
  if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
    return <WorkspaceSelectionScreen />;
  }

  // If workspace is selected but redirect hasn't happened yet, show loading
  if (activeWorkspaceId && roleLoading) {
    return <LoadingScreen />;
  }

  // Should not reach here - workspace redirect should have happened
  return <LoadingScreen />;
}
