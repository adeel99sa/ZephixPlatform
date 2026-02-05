import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { AiAssistantPanel } from '@/components/shell/AiAssistantPanel';
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { usePhase5_1Redirect } from '@/hooks/usePhase5_1Redirect';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceValidation } from '@/hooks/useWorkspaceValidation';
import WorkspaceSelectionScreen from '@/components/workspace/WorkspaceSelectionScreen';

/**
 * Routes that require workspace selection before rendering.
 * If activeWorkspaceId is missing for these routes, redirect to workspace selection.
 */
const WORKSPACE_REQUIRED_ROUTES = [
  '/templates',
  '/projects',
  '/work',        // All work management routes
  '/dashboards',
  '/resources',
  '/my-work',
];

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { workspaceReady, activeWorkspaceId, isHydrating } = useWorkspaceStore();
  
  // Validate persisted workspace on load - ensures stale IDs are cleared
  const { isValidating } = useWorkspaceValidation();

  // Phase 5.1: Redirect delivery_owner/workspace_owner to /templates if no active/draft projects
  const { isRedirecting } = usePhase5_1Redirect();

  // Check if current route requires workspace
  const requiresWorkspace = WORKSPACE_REQUIRED_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  /**
   * Workspace gate: For workspace-required routes, ensure:
   * 1. Store is hydrated (not isHydrating)
   * 2. Validation has completed (not isValidating)
   * 3. activeWorkspaceId exists
   * 
   * During validation, show loading state (not workspace selection)
   * After validation, if no workspace, show workspace selection screen.
   */
  if (requiresWorkspace) {
    // Still loading - show minimal loading state
    if (isHydrating || isValidating) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="text-sm text-slate-500">Loading...</div>
        </div>
      );
    }
    
    // No workspace selected - show workspace selection
    if (!activeWorkspaceId || !workspaceReady) {
      return <WorkspaceSelectionScreen />;
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <DemoBanner email={user?.email} />
        <main className="relative min-w-0 flex-1 overflow-auto" data-testid="main-content">
          <Outlet />
        </main>
      </div>
      {/* AI panel lives on the far right, overlayed */}
      <AiAssistantPanel />
    </div>
  );
}
