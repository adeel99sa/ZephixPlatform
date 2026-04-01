import { Navigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { platformRoleFromUser } from "@/utils/roles";

/**
 * Guard for the full-page /onboarding route.
 *
 * Only allows access when ALL of these are true:
 * - role is ADMIN
 * - onboardingStatus is not_started or in_progress
 * - user has zero accessible workspaces
 *
 * Otherwise redirects to /home.
 * Returning admins, completed users, and dismissed users always go to /home.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isLoading, onboardingStatus, workspaceCount } = useOrgHomeState();

  // While auth or onboarding status is loading, show nothing (fail-open on next render)
  if (loading || isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = platformRoleFromUser(user) === "ADMIN";
  const isBootstrap =
    isAdmin &&
    (onboardingStatus === "not_started" || onboardingStatus === "in_progress") &&
    workspaceCount === 0;

  if (!isBootstrap) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
