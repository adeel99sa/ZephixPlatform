import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

import DashboardLayout from "../DashboardLayout";

const mockUseWorkspaceValidation = vi.fn();

vi.mock("@/state/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "u-1",
      email: "admin@zephix.dev",
      platformRole: "ADMIN",
    },
  })),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeWorkspaceId: "ws-1",
  })),
}));

vi.mock("@/features/organizations/useOrgHomeState", () => ({
  useOrgHomeState: vi.fn(),
}));

vi.mock("@/hooks/useWorkspaceValidation", () => ({
  useWorkspaceValidation: (args: unknown) => mockUseWorkspaceValidation(args),
}));

vi.mock("@/components/shell/Header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/shell/NavigationRecentsTracker", () => ({
  NavigationRecentsTracker: () => null,
}));
vi.mock("@/components/shell/Sidebar", () => ({ Sidebar: () => <div>sidebar</div> }));
vi.mock("@/components/shell/DemoBanner", () => ({
  default: () => null,
}));

import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";

const mockUseOrgHomeState = vi.mocked(useOrgHomeState);

describe("DashboardLayout onboarding validation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables workspace validation when onboarding status is completed", () => {
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: "completed",
      status: undefined,
      workspaceCount: 1,
      mustOnboard: false,
      skipped: false,
      isAdmin: true,
      isMember: false,
      isViewer: false,
    });

    render(
      <MemoryRouter initialEntries={["/home"]}>
        <DashboardLayout />
      </MemoryRouter>,
    );

    expect(mockUseWorkspaceValidation).toHaveBeenCalledWith({ enabled: true });
  });

  it("disables workspace validation when onboarding status is in_progress", () => {
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: "in_progress",
      status: undefined,
      workspaceCount: 1,
      mustOnboard: false,
      skipped: false,
      isAdmin: true,
      isMember: false,
      isViewer: false,
    });

    render(
      <MemoryRouter initialEntries={["/home"]}>
        <DashboardLayout />
      </MemoryRouter>,
    );

    expect(mockUseWorkspaceValidation).toHaveBeenCalledWith({ enabled: false });
  });
});
