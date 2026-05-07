import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useOrgHomeState } from "../useOrgHomeState";
import * as onboardingApi from "../onboarding.api";

vi.mock("@/state/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/state/AuthContext";

const mockUseAuth = vi.mocked(useAuth);

function wrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useOrgHomeState single-fetch contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "admin@zephix.dev",
        platformRole: "ADMIN",
      },
      loading: false,
    } as never);
  });

  it("dedupes onboarding status fetches when multiple consumers mount together", async () => {
    const spy = vi.spyOn(onboardingApi, "getOnboardingStatus").mockResolvedValue({
      onboardingStatus: "completed",
      completed: true,
      mustOnboard: false,
      skipped: false,
      workspaceCount: 1,
      currentStep: "invite",
      completedSteps: ["org", "workspace", "invite"],
      completedAt: null,
      skippedAt: null,
    });

    renderHook(
      () => {
        useOrgHomeState();
        useOrgHomeState();
      },
      { wrapper: wrapper() },
    );

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  });
});
