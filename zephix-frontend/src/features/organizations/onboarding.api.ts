import { apiClient } from "@/lib/api/client";

export type OnboardingStatusValue =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'dismissed';

export type OnboardingStatus = {
  onboardingStatus: OnboardingStatusValue;
  completed: boolean;
  dismissed: boolean;
  mustOnboard: boolean;
  skipped: boolean; // backwards-compat alias for dismissed
  workspaceCount: number;
  completedAt: string | null;
  dismissedAt: string | null;
};

/**
 * Unwrap the backend envelope: { data: {...}, meta: {...} }
 * Falls back to raw response if no envelope.
 */
function unwrap<T>(response: any): T {
  return response?.data ?? response;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  // apiClient.get already unwraps one `{ data: T }` layer — do not destructure `.data` again.
  const payload = await apiClient.get<unknown>("/organizations/onboarding/status");
  const status = unwrap<OnboardingStatus>(payload);
  if (!status || typeof status !== "object" || !("onboardingStatus" in status)) {
    throw new Error("Invalid onboarding status response");
  }
  return status;
}

export async function skipOnboarding(): Promise<{ success: boolean; message?: string }> {
  const payload = await apiClient.post("/organizations/onboarding/skip");
  return unwrap(payload) ?? { success: false };
}

export async function completeOnboarding(): Promise<{ success: boolean; message?: string }> {
  const payload = await apiClient.post("/organizations/onboarding/complete");
  return unwrap(payload) ?? { success: false };
}
