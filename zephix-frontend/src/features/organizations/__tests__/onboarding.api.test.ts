import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOnboardingStatus } from "../onboarding.api";
import { apiClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("onboarding.api — getOnboardingStatus", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("returns status when apiClient.get returns already-unwrapped payload (single envelope)", async () => {
    const body = {
      onboardingStatus: "not_started" as const,
      completed: false,
      dismissed: false,
      mustOnboard: true,
      skipped: false,
      workspaceCount: 0,
      completedAt: null,
      dismissedAt: null,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce(body);

    await expect(getOnboardingStatus()).resolves.toEqual(body);
  });

  it("returns status when apiClient.get returns nested { data: status } (extra layer)", async () => {
    const body = {
      onboardingStatus: "completed" as const,
      completed: true,
      dismissed: false,
      mustOnboard: false,
      skipped: false,
      workspaceCount: 2,
      completedAt: null,
      dismissedAt: null,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: body });

    await expect(getOnboardingStatus()).resolves.toEqual(body);
  });

  it("throws when payload is missing onboarding fields", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({});

    await expect(getOnboardingStatus()).rejects.toThrow(/Invalid onboarding status/);
  });
});
