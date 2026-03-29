import { Outlet } from "react-router-dom";
import DemoBanner from '@/components/shell/DemoBanner';
import { useAuth } from '@/state/AuthContext';
import { usePhase5_1Redirect } from '@/hooks/usePhase5_1Redirect';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceValidation } from '@/hooks/useWorkspaceValidation';
import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';
import { useLastVisitedRouteTracker } from '@/hooks/useLastVisitedRouteTracker';
import { AppShell } from "@/ui/shell/AppShell";
import { LoadingState } from "@/ui/components/LoadingState";

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

  // Persist last visited in-app route for post-login resume.
  useLastVisitedRouteTracker();

  // Phase 5.1: Redirect delivery_owner/workspace_owner to /templates if no active/draft projects
  usePhase5_1Redirect();

  /**
   * GATE 1 CHECK: Block everything while checking onboarding status.
   */
  if (onboardingChecking) {
    return (
      <div className="h-screen bg-slate-50">
        <LoadingState message="Setting up your experience..." className="h-full" />
      </div>
    );
  }

  return (
    <AppShell banner={<DemoBanner email={user?.email} />}>
      <Outlet />
    </AppShell>
  );
}
