import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { useOnboardingCheck } from "../useOnboardingCheck";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";
import * as onboardingApi from "@/features/organizations/onboarding.api";

vi.mock("@/state/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/state/AuthContext";

const mockUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function createWrapper(initialPath: string) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { Wrapper, qc };
}

describe("useOnboardingCheck + org onboarding query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "a@zephix.dev",
        platformRole: "ADMIN",
        organizationId: "org-1",
      },
      loading: false,
    });
  });

  it("dedupes getOnboardingStatus when check and useOrgHomeState mount together", async () => {
    const spy = vi.spyOn(onboardingApi, "getOnboardingStatus").mockResolvedValue({
      onboardingStatus: "completed",
      completed: true,
      dismissed: false,
      mustOnboard: false,
      skipped: false,
      workspaceCount: 1,
      completedAt: null,
      dismissedAt: null,
    });

    const { Wrapper } = createWrapper("/home");

    renderHook(
      () => {
        useOnboardingCheck();
        useOrgHomeState();
      },
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls.length).toBe(1);
    spy.mockRestore();
  });

  it("returns onboardingComplete for MEMBER without blocking on fetch", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-2",
        email: "m@zephix.dev",
        platformRole: "MEMBER",
        organizationId: "org-1",
      },
      loading: false,
    });

    const spy = vi.spyOn(onboardingApi, "getOnboardingStatus").mockResolvedValue({
      onboardingStatus: "not_started",
      completed: false,
      dismissed: false,
      mustOnboard: true,
      skipped: false,
      workspaceCount: 0,
      completedAt: null,
      dismissedAt: null,
    });

    const { Wrapper } = createWrapper("/home");
    const { result } = renderHook(() => useOnboardingCheck(), { wrapper: Wrapper });

    expect(result.current.checking).toBe(false);
    expect(result.current.onboardingComplete).toBe(true);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(result.current.onboardingComplete).toBe(true);
    spy.mockRestore();
  });
});
