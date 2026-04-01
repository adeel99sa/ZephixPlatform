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
  const { data } = await apiClient.get("/organizations/onboarding/status");
  return unwrap<OnboardingStatus>(data);
}

export async function skipOnboarding(): Promise<{ success: boolean; message?: string }> {
  const { data } = await apiClient.post("/organizations/onboarding/skip");
  return unwrap(data);
}

export async function completeOnboarding(): Promise<{ success: boolean; message?: string }> {
  const { data } = await apiClient.post("/organizations/onboarding/complete");
  return unwrap(data);
}
