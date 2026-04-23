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
  /** Legacy field — may be absent on newer backends. */
  onboardingStatus?: string;
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
  // Backend returns { completed, mustOnboard, skipped, workspaceCount, ... }
  // Validate against the actual contract — must have `mustOnboard` boolean.
  if (!status || typeof status !== "object" || typeof (status as any).mustOnboard !== "boolean") {
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
