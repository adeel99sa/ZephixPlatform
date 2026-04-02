import { useAuth } from "@/state/AuthContext";

export interface OnboardingCheckState {
  /** True while checking onboarding status */
  checking: boolean;
  /** True if safe to render workspace shell and run workspace validation */
  onboardingComplete: boolean;
  /** Error message if check failed */
  error: string | null;
}

/**
 * Shell must never block on onboarding fetches (Batch 1 + 2).
 *
 * Full-page `/onboarding` is guarded by OnboardingGuard; shell may redirect via DashboardLayout
 * when `shouldRunAdminFirstTimeOnboarding` is true. This hook only gates on auth loading.
 */
export function useOnboardingCheck(): OnboardingCheckState {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return { checking: true, onboardingComplete: false, error: null };
  }
  if (!user) {
    return { checking: false, onboardingComplete: false, error: null };
  }

  return { checking: false, onboardingComplete: true, error: null };
}
