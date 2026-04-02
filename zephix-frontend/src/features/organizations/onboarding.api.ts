import { apiClient } from "@/lib/api/client";

export type OnboardingStatus = {
  completed: boolean;
  mustOnboard: boolean;
  skipped: boolean;
  workspaceCount: number;
  currentStep: string;
  completedSteps: string[];
  completedAt: string | null;
  skippedAt: string | null;
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
