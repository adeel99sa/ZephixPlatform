import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { AiAssistantPanel } from '@/components/shell/AiAssistantPanel';
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { usePhase5_1Redirect } from '@/hooks/usePhase5_1Redirect';
import { useWorkspaceStore } from '@/state/workspace.store';
import WorkspaceSelectionScreen from '@/components/workspace/WorkspaceSelectionScreen';

// Patch 1: Routes that require workspace selection
// Note: /workspaces does NOT require workspace selection - it IS the workspace selection page
const WORKSPACE_REQUIRED_ROUTES = ['/home', '/templates', '/projects'];

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { workspaceReady } = useWorkspaceStore();

  // Phase 5.1: Redirect delivery_owner/workspace_owner to /templates if no active/draft projects
  // Patch 2: Get isRedirecting to prevent Home flicker
  const { isRedirecting } = usePhase5_1Redirect();

  // Patch 1: Check if current route requires workspace
  const requiresWorkspace = WORKSPACE_REQUIRED_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  // PROMPT 4: Gate main outlet render - show workspace selection if required and not ready
  // Also check if we're hydrating to prevent flicker
  const { isHydrating } = useWorkspaceStore();
  if (requiresWorkspace && (!workspaceReady || isHydrating)) {
    return <WorkspaceSelectionScreen />;
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
