/**
 * W2-F3 — Administration landing: default route + governance containment on Overview.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";

import AdministrationOverviewPage from "@/features/administration/pages/AdministrationOverviewPage";
import AdministrationGovernancePage from "@/features/administration/pages/AdministrationGovernancePage";
import AdministrationGeneralPage from "@/features/administration/pages/AdministrationGeneralPage";
import { ADMINISTRATION_NAV_GROUPS } from "@/features/administration/constants";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getWorkspaceSnapshot: vi.fn(),
    listRecentActivity: vi.fn(),
    getGovernanceHealth: vi.fn(),
    listPendingDecisions: vi.fn(),
    listGovernanceQueue: vi.fn(),
    listWorkspaces: vi.fn(),
    getGovernancePolicySummary: vi.fn(),
    listWorkspaceGovernancePolicies: vi.fn(),
  },
}));

vi.mock("@/features/administration/components/GovernancePoliciesTable", () => ({
  GovernancePoliciesTable: () => <div data-testid="governance-policies-table" />,
}));

vi.mock("@/features/administration/components/OrganizationProfileForm", () => ({
  OrganizationProfileForm: () => <div data-testid="org-profile-form" />,
}));

vi.mock("@/features/administration/components/RbacMigrationSummaryTile", () => ({
  RbacMigrationSummaryTile: () => null,
}));

import { administrationApi } from "@/features/administration/api/administration.api";

/** Mirrors App.tsx AdministrationIndexRoute admin branch. */
function AdminIndexToGeneral() {
  return <Navigate to="/administration/general" replace />;
}

describe("W2-F3 admin landing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrationApi.getWorkspaceSnapshot).mockResolvedValue({
      data: [
        {
          workspaceId: "ws-1",
          workspaceName: "Alpha",
          projectCount: 3,
          budgetStatus: "On track",
          capacityStatus: "Healthy",
          openExceptions: 2,
        },
      ],
      meta: { page: 1, limit: 20, total: 1 },
    });
    vi.mocked(administrationApi.listRecentActivity).mockResolvedValue([]);
    vi.mocked(administrationApi.getGovernanceHealth).mockResolvedValue({
      activePolicies: 4,
      capacityWarnings: 2,
      budgetWarnings: 1,
      hardBlocksThisWeek: 3,
    });
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 1, total: 0 },
    });
    vi.mocked(administrationApi.listWorkspaces).mockResolvedValue([
      {
        workspaceId: "ws-1",
        workspaceName: "Alpha",
        projectCount: 3,
        budgetStatus: "OK",
        capacityStatus: "OK",
        openExceptions: 0,
        owners: [],
        status: "ACTIVE",
      },
    ]);
    vi.mocked(administrationApi.getGovernancePolicySummary).mockResolvedValue({
      workspaceId: "ws-1",
      complexityMode: "GOVERNED",
      total: 9,
      activeCount: 9,
      evaluableActiveCount: 7,
    });
    vi.mocked(administrationApi.listWorkspaceGovernancePolicies).mockResolvedValue([]);
  });

  it("redirects /administration index to General settings for admins", async () => {
    render(
      <MemoryRouter initialEntries={["/administration"]}>
        <Routes>
          <Route path="/administration" element={<AdminIndexToGeneral />} />
          <Route path="/administration/general" element={<AdministrationGeneralPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
    });
  });

  it("does not render Decisions Required or Governance Health on Overview", async () => {
    render(
      <MemoryRouter>
        <AdministrationOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Workspace Snapshot")).toBeInTheDocument();
    });

    expect(screen.queryByText("Decisions Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Governance Health")).not.toBeInTheDocument();
    expect(screen.queryByText("No governance decisions pending.")).not.toBeInTheDocument();
    expect(screen.queryByText("No governance alerts.")).not.toBeInTheDocument();
  });

  it("omits Open Exceptions column from workspace snapshot table", async () => {
    render(
      <MemoryRouter>
        <AdministrationOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
    });

    expect(screen.queryByText("Open Exceptions")).not.toBeInTheDocument();
    expect(screen.getByText("Workspace Name")).toBeInTheDocument();
    expect(screen.getByText("Capacity Status")).toBeInTheDocument();
  });

  it("shows Active policies scoped to this workspace; omits phantom Hard blocks card", async () => {
    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Active policies \(this workspace\)/i)).toBeInTheDocument();
      expect(screen.getByTestId("governance-active-policies-metric")).toHaveTextContent(
        "7 of 9 enforcing",
      );
    });

    expect(screen.queryByText("Hard blocks (this week)")).not.toBeInTheDocument();
    expect(screen.queryByText("Capacity warnings")).not.toBeInTheDocument();
    expect(screen.queryByText("Budget warnings")).not.toBeInTheDocument();
  });

  it("includes Overview nav entry for admins", () => {
    const overview = ADMINISTRATION_NAV_GROUPS.find((g) => g.label === "Administration")?.items.find(
      (i) => i.label === "Overview",
    );
    expect(overview?.path).toBe("/administration/overview");
  });
});
