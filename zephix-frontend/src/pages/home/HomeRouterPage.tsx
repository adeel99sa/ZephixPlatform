import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { LoadingScreen } from "../../components/common/LoadingScreen";
import { useAuth } from "../../state/AuthContext";
import { useWorkspaceRole } from "../../hooks/useWorkspaceRole";
import { useWorkspaceStore } from "../../state/workspace.store";
import { listWorkspaces } from "../../features/workspaces/api";

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
  if (role === "admin") return "/admin/home";
  if (role === "member") return "/my-work";
  return "/guest/home";
}

export default function HomeRouterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Map isAuthenticated from user existence if not provided
  const isAuthenticatedValue = isAuthenticated !== undefined ? isAuthenticated : !!user;

  const {
    activeWorkspaceId,
    setActiveWorkspace,
  } = useWorkspaceStore();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  // Only fetch workspace role if workspace is selected (lazy loading)
  const { role: workspaceRole, loading: roleLoading } = useWorkspaceRole(
    activeWorkspaceId || undefined
  );

  const lastWorkspaceId = useMemo(() => {
    try {
      return localStorage.getItem(LAST_WORKSPACE_KEY) || "";
    } catch {
      return "";
    }
  }, []);

  // Check onboarding status first, then fetch workspaces
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticatedValue || !user) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    const checkOnboardingAndFetchWorkspaces = async () => {
      try {
        setWorkspacesLoading(true);
        
        // First check onboarding status
        const { onboardingApi } = await import('@/services/onboardingApi');
        const onboardingStatus = await onboardingApi.getOnboardingStatus();
        
        // If user has no org or no workspace, route to onboarding
        if (onboardingStatus.hasOrganization === false) {
          navigate("/onboarding", { replace: true });
          return;
        }
        
        if (onboardingStatus.hasOrganization === true && onboardingStatus.hasWorkspace === false) {
          navigate("/onboarding", { replace: true });
          return;
        }
        
        // User has org and workspace - fetch workspaces
        const list = await listWorkspaces();
        setWorkspaces(Array.isArray(list) ? list : []);
      } catch (error: any) {
        console.error("Failed to check onboarding or fetch workspaces:", error);
        
        // If 403 error, user likely has no org - route to onboarding
        if (error?.response?.status === 403 || error?.message?.includes('403')) {
          navigate("/onboarding", { replace: true });
          return;
        }
        
        // Other errors - set empty array and let routing logic handle it
        setWorkspaces([]);
      } finally {
        setWorkspacesLoading(false);
      }
    };

    checkOnboardingAndFetchWorkspaces();
  }, [authLoading, isAuthenticatedValue, user, navigate, location.pathname]);

  // Handle workspace resolution
  useEffect(() => {
    if (workspacesLoading) return;
    if (!isAuthenticatedValue || !user) return;

    if (!workspaces || workspaces.length === 0) {
      navigate("/onboarding", { replace: true });
      return;
    }

    if (activeWorkspaceId) return;

    // Auto-select if only 1 workspace
    if (workspaces.length === 1) {
      const id = String((workspaces[0] as any).id || "");
      if (!id) {
        navigate("/select-workspace", { replace: true });
        return;
      }
      setActiveWorkspace(id);
      try {
        localStorage.setItem(LAST_WORKSPACE_KEY, id);
      } catch {}
      return;
    }

    // Try to restore last selected workspace
    if (lastWorkspaceId && workspaces.some((w: any) => String(w.id) === lastWorkspaceId)) {
      setActiveWorkspace(lastWorkspaceId);
      return;
    }

    // No workspace selected, go to selection screen
    navigate("/select-workspace", { replace: true });
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

  // Route based on role once workspace is selected
  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (roleLoading) return;

    const effective = normalizeRole(workspaceRole);
    const target = routeForRole(effective);

    navigate(target, { replace: true });
  }, [activeWorkspaceId, roleLoading, workspaceRole, navigate]);

  const loading = authLoading || workspacesLoading || roleLoading;

  if (loading) return <LoadingScreen />;

  if (!user) return <LoadingScreen />;

  return <LoadingScreen />;
}
