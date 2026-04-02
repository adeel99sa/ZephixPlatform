import type { OnboardingStatusValue } from "@/features/organizations/onboarding.api";
import { PLATFORM_ROLE, type PlatformRole } from "@/utils/roles";

/**
 * Single source of truth: brand-new Admin org onboarding (two-step flow).
 * False for Member, Viewer, completed/dismissed admins, and unknown status (fail open).
 */
export function shouldRunAdminFirstTimeOnboarding(params: {
  platformRole: PlatformRole;
  onboardingStatus: OnboardingStatusValue | undefined;
}): boolean {
  if (params.platformRole !== PLATFORM_ROLE.ADMIN) return false;
  const s = params.onboardingStatus;
  if (s === undefined) return false;
  return s === "not_started" || s === "in_progress";
}
