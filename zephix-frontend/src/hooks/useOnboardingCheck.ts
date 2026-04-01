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
 * Onboarding UI lives on Unified Home (Admin panel + Member/Viewer cards; Batch 2).
 * Shell is not blocked and we do not redirect into the legacy full-page /onboarding wizard.
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
