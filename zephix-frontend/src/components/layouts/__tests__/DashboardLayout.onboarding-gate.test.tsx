import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DashboardLayout from "../DashboardLayout";

vi.mock("@/components/shell/Header", () => ({ Header: () => <div>header</div> }));
vi.mock("@/components/shell/NavigationRecentsTracker", () => ({
  NavigationRecentsTracker: () => null,
}));
vi.mock("@/components/shell/Sidebar", () => ({ Sidebar: () => <div>sidebar</div> }));
vi.mock("@/components/shell/DemoBanner", () => ({ default: () => null }));

vi.mock("@/hooks/useWorkspaceValidation", () => ({
  useWorkspaceValidation: vi.fn(),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: vi.fn(() => ({ activeWorkspaceId: "ws-1" })),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/organizations/useOrgHomeState", () => ({
  useOrgHomeState: vi.fn(),
}));

import { useAuth } from "@/state/AuthContext";
import { useOrgHomeState } from "@/features/organizations/useOrgHomeState";

const mockUseAuth = vi.mocked(useAuth);
const mockUseOrgHomeState = vi.mocked(useOrgHomeState);

function renderShell() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<div>HOME</div>} />
        </Route>
        <Route path="/onboarding" element={<div>ONBOARDING</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardLayout onboarding gate scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects ADMIN with mustOnboard=true / not_started status", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-admin", email: "admin@z.dev", platformRole: "ADMIN" },
    } as never);
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: "not_started",
      status: undefined,
      workspaceCount: 0,
      mustOnboard: true,
      skipped: false,
      isAdmin: true,
      isMember: false,
      isViewer: false,
    });

    renderShell();
    expect(await screen.findByText("ONBOARDING")).toBeInTheDocument();
  });

  it("redirects ADMIN with in_progress status", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-admin", email: "admin@z.dev", platformRole: "ADMIN" },
    } as never);
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

    renderShell();
    expect(await screen.findByText("ONBOARDING")).toBeInTheDocument();
  });

  it("does not redirect ADMIN with completed status", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-admin", email: "admin@z.dev", platformRole: "ADMIN" },
    } as never);
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

    renderShell();
    expect(await screen.findByText("HOME")).toBeInTheDocument();
    expect(screen.queryByText("ONBOARDING")).not.toBeInTheDocument();
  });

  it("does not redirect MEMBER even when status is not_started", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-member", email: "member@z.dev", platformRole: "MEMBER" },
    } as never);
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: "not_started",
      status: undefined,
      workspaceCount: 0,
      mustOnboard: true,
      skipped: false,
      isAdmin: false,
      isMember: true,
      isViewer: false,
    });

    renderShell();
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });

  it("does not redirect VIEWER even when status is not_started", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-viewer", email: "viewer@z.dev", platformRole: "VIEWER" },
    } as never);
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: "not_started",
      status: undefined,
      workspaceCount: 0,
      mustOnboard: true,
      skipped: false,
      isAdmin: false,
      isMember: false,
      isViewer: true,
    });

    renderShell();
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });

  it("fails open for ADMIN when onboarding status is undefined", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-admin", email: "admin@z.dev", platformRole: "ADMIN" },
    } as never);
    mockUseOrgHomeState.mockReturnValue({
      isLoading: false,
      onboardingStatus: undefined,
      status: undefined,
      workspaceCount: 0,
      mustOnboard: false,
      skipped: false,
      isAdmin: true,
      isMember: false,
      isViewer: false,
    });

    renderShell();
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });

  it("does not redirect while org onboarding status is loading", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u-admin", email: "admin@z.dev", platformRole: "ADMIN" },
    } as never);
    mockUseOrgHomeState.mockReturnValue({
      isLoading: true,
      onboardingStatus: undefined,
      status: undefined,
      workspaceCount: 0,
      mustOnboard: false,
      skipped: false,
      isAdmin: true,
      isMember: false,
      isViewer: false,
    });

    renderShell();
    expect(await screen.findByText("HOME")).toBeInTheDocument();
  });
});
