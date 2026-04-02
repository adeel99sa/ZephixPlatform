import { completeOnboarding, skipOnboarding } from "@/features/organizations/onboarding.api";

/**
 * Ends the Admin full-page onboarding flow on the server without leaving the user
 * stuck in `in_progress` (which would retrigger the shell → /onboarding redirect).
 *
 * 1. Prefer `complete` (happy path).
 * 2. If that fails, fall back to `skip` so org onboarding is no longer active.
 */
export async function finalizeAdminOnboardingOnServer(): Promise<boolean> {
  try {
    await completeOnboarding();
    return true;
  } catch {
    try {
      await skipOnboarding();
      return true;
    } catch {
      return false;
    }
  }
}
