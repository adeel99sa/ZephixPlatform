import type { OnboardingStatusValue } from "@/features/organizations/onboarding.api";

/**
 * Full-page /onboarding is only for strict Admin first-run bootstrap:
 * not completed/dismissed, no accessible workspaces (per API), status not_started or in_progress.
 *
 * Cross-device / reused accounts are governed by Batch 1 user-level onboarding state and workspaceCount.
 * Do not use client heuristics here that would fight first /home load after signup.
 */
export function shouldUseFullPageOnboarding(input: {
  platformRole: string;
  onboardingStatus?: OnboardingStatusValue;
  completed: boolean;
  dismissed: boolean;
  hasAccessibleWorkspace: boolean;
}): boolean {
  const { platformRole, onboardingStatus, completed, dismissed, hasAccessibleWorkspace } = input;

  if (platformRole !== "ADMIN") return false;
  if (completed) return false;
  if (dismissed) return false;
  if (onboardingStatus === "completed" || onboardingStatus === "dismissed") return false;
  if (hasAccessibleWorkspace) return false;
  if (onboardingStatus !== "not_started" && onboardingStatus !== "in_progress") return false;
  return true;
}
