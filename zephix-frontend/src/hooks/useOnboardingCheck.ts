import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { useOrgOnboardingStatusQuery } from "@/features/organizations/useOrgOnboardingStatusQuery";

export interface OnboardingCheckState {
  /** True while checking onboarding status */
  checking: boolean;
  /** True if safe to render workspace shell and run workspace validation */
  onboardingComplete: boolean;
  /** Error message if check failed */
  error: string | null;
}

function isOnboardingDone(status: {
  onboardingStatus?: string;
  completed?: boolean;
  dismissed?: boolean;
  skipped?: boolean;
}): boolean {
  return (
    status.onboardingStatus === "completed" ||
    status.onboardingStatus === "dismissed" ||
    status.completed === true ||
    status.dismissed === true ||
    status.skipped === true
  );
}

/**
 * Admin-only redirect to /onboarding when org mustOnboard (Batch 1 rules).
 * Uses the same React Query cache as useOrgHomeState — no per-effect fetch loop.
 */
export function useOnboardingCheck(): OnboardingCheckState {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const userId = user?.id ?? "";
  const platformRole = user?.platformRole ?? (user as { role?: string })?.role ?? "";
  const isAdmin = platformRole === "ADMIN";

  const { data: status, isPending, isError, error } = useOrgOnboardingStatusQuery();

  const shouldRedirectAdminToOnboarding = useMemo(() => {
    if (!userId || !isAdmin) return false;
    if (pathname === "/onboarding") return false;
    if (!status) return false;
    if (isOnboardingDone(status)) return false;
    return status.mustOnboard === true;
  }, [userId, isAdmin, pathname, status]);

  useEffect(() => {
    if (!shouldRedirectAdminToOnboarding) return;
    navigate("/onboarding", { replace: true });
  }, [shouldRedirectAdminToOnboarding, navigate]);

  if (authLoading) {
    return { checking: true, onboardingComplete: false, error: null };
  }
  if (!userId) {
    return { checking: false, onboardingComplete: false, error: null };
  }
  if (!isAdmin) {
    return { checking: false, onboardingComplete: true, error: null };
  }
  if (pathname === "/onboarding") {
    return { checking: false, onboardingComplete: false, error: null };
  }
  if (isError) {
    return {
      checking: false,
      onboardingComplete: true,
      error: error instanceof Error ? error.message : "Failed to check onboarding status",
    };
  }
  if (isPending) {
    return { checking: true, onboardingComplete: false, error: null };
  }
  if (!status) {
    return { checking: false, onboardingComplete: true, error: null };
  }

  if (shouldRedirectAdminToOnboarding) {
    return { checking: false, onboardingComplete: false, error: null };
  }

  return { checking: false, onboardingComplete: true, error: null };
}
