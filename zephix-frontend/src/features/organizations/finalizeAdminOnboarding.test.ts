import { describe, it, expect, vi, beforeEach } from "vitest";
import { finalizeAdminOnboardingOnServer } from "./finalizeAdminOnboarding";

vi.mock("@/features/organizations/onboarding.api", () => ({
  completeOnboarding: vi.fn(),
  skipOnboarding: vi.fn(),
}));

import { completeOnboarding, skipOnboarding } from "@/features/organizations/onboarding.api";

const mockComplete = completeOnboarding as ReturnType<typeof vi.fn>;
const mockSkip = skipOnboarding as ReturnType<typeof vi.fn>;

describe("finalizeAdminOnboardingOnServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when complete succeeds", async () => {
    mockComplete.mockResolvedValueOnce({ success: true });
    await expect(finalizeAdminOnboardingOnServer()).resolves.toBe(true);
    expect(mockSkip).not.toHaveBeenCalled();
  });

  it("falls back to skip when complete fails, returns true if skip succeeds", async () => {
    mockComplete.mockRejectedValueOnce(new Error("network"));
    mockSkip.mockResolvedValueOnce({ success: true });
    await expect(finalizeAdminOnboardingOnServer()).resolves.toBe(true);
    expect(mockSkip).toHaveBeenCalledTimes(1);
  });

  it("returns false when both complete and skip fail", async () => {
    mockComplete.mockRejectedValueOnce(new Error("network"));
    mockSkip.mockRejectedValueOnce(new Error("network"));
    await expect(finalizeAdminOnboardingOnServer()).resolves.toBe(false);
  });
});
