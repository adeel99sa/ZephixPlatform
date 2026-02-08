import { Outlet } from "react-router-dom";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { AiAssistantPanel } from '@/components/shell/AiAssistantPanel';
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { usePhase5_1Redirect } from '@/hooks/usePhase5_1Redirect';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceValidation } from '@/hooks/useWorkspaceValidation';
import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';

/**
 * DashboardLayout — always renders the app shell (Sidebar + Header).
 *
 * Workspace gating is handled at the route level by <RequireWorkspace />.
 * This layout only manages:
 *   GATE 1 — Onboarding check (admin redirect to /onboarding)
 *   GATE 2 — Workspace validation (validates persisted ID if one exists)
 */
export default function DashboardLayout() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();

  /**
   * GATE 1: Onboarding check — MUST run FIRST before any workspace calls.
   * If onboarding is incomplete (admin only), user is redirected to /onboarding.
   */
  const { checking: onboardingChecking, onboardingComplete } = useOnboardingCheck();

  /**
   * GATE 2: Workspace validation — only runs after onboarding is complete
   * AND when a workspace is actually selected. Prevents 403 errors on
   * workspace APIs for new users with zero workspaces.
   */
  useWorkspaceValidation({
    enabled: onboardingComplete && Boolean(activeWorkspaceId),
  });

  // Phase 5.1: Redirect delivery_owner/workspace_owner to /templates if no active/draft projects
  usePhase5_1Redirect();

  /**
   * GATE 1 CHECK: Block everything while checking onboarding status.
   */
  if (onboardingChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-500">Setting up your experience...</p>
        </div>
      </div>
    );
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
      <AiAssistantPanel />
    </div>
  );
}
