import type { OnboardingStatusValue } from "@/features/organizations/onboarding.api";
import { PLATFORM_ROLE, type PlatformRole } from "@/utils/roles";

/**
 * Single source of truth for when the **shell** may send an Admin to `/onboarding`.
 *
 * ## True only when (all required)
 * - `platformRole === ADMIN`
 * - `onboardingStatus` is exactly `not_started` OR `in_progress` (from GET `/organizations/onboarding/status`)
 *
 * ## Always false (no retrap)
 * - `completed` — returning Admin, finished flow
 * - `dismissed` — skipped / dismissed Admin
 * - `MEMBER` / `VIEWER` — never see Admin onboarding
 * - `onboardingStatus === undefined` — **fail open**: while loading or if the status call failed, we do **not**
 *   redirect (avoids blocking the shell on transient errors). Staging should confirm API reliability.
 *
 * ## Why the route guard allows `/onboarding` after a workspace exists
 * Step 1 creates a workspace while org status can still be `in_progress`. Step 2 (invites) must stay reachable
 * on `/onboarding` until `finalizeAdminOnboardingOnServer()` completes (complete, or skip fallback) so the user
 * is not bounced back by the shell mid-flow.
 *
 * Staging checklist: brand-new Admin, skip-workspace path, returning / dismissed / completed Admin, Member, Viewer.
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
