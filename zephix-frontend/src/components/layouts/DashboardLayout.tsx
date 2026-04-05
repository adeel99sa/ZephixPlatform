import { Navigate, Outlet } from "react-router-dom";
import { Header } from "@/components/shell/Header";
import { NavigationRecentsTracker } from "@/components/shell/NavigationRecentsTracker";
import { Sidebar } from "@/components/shell/Sidebar";
import DemoBanner from '@/components/shell/DemoBanner';
import { EmailVerificationBanner } from '@/components/shell/EmailVerificationBanner';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceValidation } from '@/hooks/useWorkspaceValidation';
import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { platformRoleFromUser } from "@/utils/roles";
import { shouldRunAdminFirstTimeOnboarding } from "@/routing/adminOnboardingPolicy";

/**
 * DashboardLayout — always renders the app shell (Sidebar + Header).
 *
 * Workspace gating is handled at the route level by <RequireWorkspace />.
 *
 * GATE 1 — Redirect to `/onboarding` **only** when `shouldRunAdminFirstTimeOnboarding` is true:
 * Admin + (`not_started` | `in_progress`). Never for completed, dismissed, Member, or Viewer.
 * Waits until org onboarding status has loaded (`!orgHomeLoading`) so we do not redirect on `undefined`.
 *
 * GATE 2 — Workspace validation (validates persisted ID when a workspace is selected).
 */
export default function DashboardLayout() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { isLoading: orgHomeLoading, onboardingStatus } = useOrgHomeState();

  /**
   * GATE 1: Brand-new Admin with incomplete org onboarding → full-page flow.
   */
  const { checking: onboardingChecking, onboardingComplete } = useOnboardingCheck();
  const platformRole = platformRoleFromUser(user);
  const needsAdminOnboarding =
    Boolean(user) &&
    !orgHomeLoading &&
    shouldRunAdminFirstTimeOnboarding({ platformRole, onboardingStatus });

  useWorkspaceValidation({
    enabled: onboardingComplete && Boolean(activeWorkspaceId),
  });


  /**
   * GATE 1 CHECK: Legacy hook only gates on auth loading.
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

  if (needsAdminOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen">
      <NavigationRecentsTracker />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <EmailVerificationBanner />
        <DemoBanner email={user?.email} />
        <main className="relative z-0 min-h-0 min-w-0 flex-1 overflow-auto" data-testid="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
