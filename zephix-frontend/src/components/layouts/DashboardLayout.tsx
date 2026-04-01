import { Outlet } from "react-router-dom";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { AiAssistantPanel } from '@/components/shell/AiAssistantPanel';
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { usePhase5_1Redirect } from '@/hooks/usePhase5_1Redirect';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceValidation } from '@/hooks/useWorkspaceValidation';
/**
 * DashboardLayout — always renders the app shell (Sidebar + Header).
 *
 * Workspace gating is handled at the route level by <RequireWorkspace />.
 * Onboarding is inline on Unified Home (Batch 2), not a layout gate.
 * Workspace validation runs when a workspace is selected.
 */
export default function DashboardLayout() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  useWorkspaceValidation({
    enabled: Boolean(activeWorkspaceId),
  });

  // Phase 5.1: Redirect delivery_owner/workspace_owner to /templates if no active/draft projects
  usePhase5_1Redirect();

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
      <AiAssistantPanel />
    </div>
  );
}
