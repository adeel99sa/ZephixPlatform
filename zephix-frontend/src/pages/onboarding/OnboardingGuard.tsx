import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import { platformRoleFromUser } from "@/utils/roles";
import { shouldRunAdminFirstTimeOnboarding } from "@/routing/adminOnboardingPolicy";

/**
 * Guard for the full-page /onboarding route (Admin-only two-step flow).
 * Allows access while org onboarding status is not_started or in_progress — including
 * after a workspace is created (invite step). Everyone else redirects to /home.
 */
export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isLoading, onboardingStatus } = useOrgHomeState();

  if (loading || isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const platformRole = platformRoleFromUser(user);
  const allow = shouldRunAdminFirstTimeOnboarding({ platformRole, onboardingStatus });

  if (!allow) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
