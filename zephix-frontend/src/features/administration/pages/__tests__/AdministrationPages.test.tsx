import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdministrationOverviewPage from "../AdministrationOverviewPage";
import AdministrationGovernancePage from "../AdministrationGovernancePage";
import AdministrationUsersPage from "../AdministrationUsersPage";
import AdministrationOrganizationPage from "../AdministrationOrganizationPage";
import AdministrationTeamsPage from "../AdministrationTeamsPage";
import AdministrationAccessControlPage from "../AdministrationAccessControlPage";
import AdministrationWorkspacesPage from "../AdministrationWorkspacesPage";
import AdministrationTemplatesPage from "../AdministrationTemplatesPage";
import AdministrationBillingPage from "../AdministrationBillingPage";
import AdministrationSecurityPage from "../AdministrationSecurityPage";

vi.mock("@/lib/api", () => ({
  request: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    listPendingDecisions: vi.fn(),
    getGovernanceHealth: vi.fn(),
    getWorkspaceSnapshot: vi.fn(),
    listRecentActivity: vi.fn(),
    listGovernanceQueue: vi.fn(),
    listGovernanceApprovals: vi.fn(),
    approveException: vi.fn(),
    rejectException: vi.fn(),
    requestMoreInfo: vi.fn(),
    listUsers: vi.fn(),
    getOrganizationProfile: vi.fn(),
    updateOrganizationProfile: vi.fn(),
    getAccessControlSummary: vi.fn(),
    changeUserRole: vi.fn(),
    deactivateUser: vi.fn(),
    inviteUsers: vi.fn(),
    listWorkspaces: vi.fn(),
    listTemplates: vi.fn(),
    getBillingSummary: vi.fn(),
    getBillingInvoices: vi.fn(),
  },
}));

vi.mock("@/features/admin/teams/api/teamsApi", () => ({
  teamsApi: {
    getTeams: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
  },
}));

import { administrationApi } from "@/features/administration/api/administration.api";
import { teamsApi } from "@/features/admin/teams/api/teamsApi";

describe("Administration pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.mocked(administrationApi.getGovernanceHealth).mockResolvedValue({
      activePolicies: 0,
      capacityWarnings: 0,
      budgetWarnings: 0,
      hardBlocksThisWeek: 0,
    });
    vi.mocked(administrationApi.getWorkspaceSnapshot).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.mocked(administrationApi.listRecentActivity).mockResolvedValue([]);
    vi.mocked(administrationApi.listGovernanceQueue).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.mocked(administrationApi.listGovernanceApprovals).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.mocked(administrationApi.listUsers).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    vi.mocked(administrationApi.getOrganizationProfile).mockResolvedValue({
      id: "org-1",
      name: "Zephix Org",
      slug: "zephix-org",
      status: "active",
      website: "https://zephix.ai",
      industry: "Technology",
      size: "enterprise",
      description: "Org description",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      planCode: "enterprise",
      planStatus: "active",
      planExpiresAt: null,
      metadataSummary: {
        trialEndsAt: null,
        dataRegion: "us-east-1",
        allowedEmailDomain: "zephix.ai",
      },
      tenantSummary: { totalUsers: 1, totalWorkspaces: 1 },
    });
    vi.mocked(teamsApi.getTeams).mockResolvedValue([]);
    vi.mocked(administrationApi.getAccessControlSummary).mockResolvedValue({
      platformRoles: [
        {
          role: "ADMIN",
          canCreateWorkspaces: true,
          canManageOrganizationGovernance: true,
          defaultAccessMode: "read_write",
        },
      ],
      workspaceRoles: [
        {
          role: "workspace_owner",
          hierarchyRank: 3,
          mutable: true,
        },
      ],
      roleMappings: [{ legacyRole: "admin", normalizedRole: "ADMIN" }],
      policyNotes: ["Platform role is source of truth."],
    });
    vi.mocked(administrationApi.listWorkspaces).mockResolvedValue([]);
    vi.mocked(administrationApi.listTemplates).mockResolvedValue([]);
    vi.mocked(administrationApi.getBillingSummary).mockResolvedValue({
      currentPlan: "enterprise",
      planStatus: "active",
      renewalDate: null,
      usage: { activeUsers: 0, workspaces: 0, storageBytesUsed: 0 },
    });
    vi.mocked(administrationApi.getBillingInvoices).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
  });

  it("renders governance overview with API-driven empty state", async () => {
    render(
      <MemoryRouter>
        <AdministrationOverviewPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("No governance decisions pending.")).toBeInTheDocument(),
    );
  });

  it("renders governance page queue tab with API empty state", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );
    const exceptionsTab = await screen.findByRole("button", { name: "Exceptions" });
    await user.click(exceptionsTab);
    await waitFor(() =>
      expect(screen.getByText("No exceptions in queue.")).toBeInTheDocument(),
    );
  });

  it("renders users page with API empty state", async () => {
    render(
      <MemoryRouter>
        <AdministrationUsersPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("No users available.")).toBeInTheDocument());
  });

  it("renders organization page with source-backed profile fields", async () => {
    render(
      <MemoryRouter>
        <AdministrationOrganizationPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Save organization profile")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("Zephix Org")).toBeInTheDocument();
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
  });

  it("renders teams page empty state", async () => {
    render(
      <MemoryRouter>
        <AdministrationTeamsPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("No teams available.")).toBeInTheDocument(),
    );
  });

  it("renders access control page with role matrix", async () => {
    render(
      <MemoryRouter>
        <AdministrationAccessControlPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Platform Roles")).toBeInTheDocument(),
    );
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
  });

  it("renders workspaces and templates pages with API empty states", async () => {
    render(
      <MemoryRouter>
        <AdministrationWorkspacesPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("No workspaces available.")).toBeInTheDocument(),
    );

    render(
      <MemoryRouter>
        <AdministrationTemplatesPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("No templates available.")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/This admin page is visibility-only in MVP/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create template entry \(disabled\)/i }),
    ).toBeDisabled();
  });

  it("renders billing page summary and invoices empty state", async () => {
    render(
      <MemoryRouter>
        <AdministrationBillingPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("No invoices available.")).toBeInTheDocument());
    expect(screen.getByText(/enterprise/i)).toBeInTheDocument();
  });

  it("renders security page contract sections", async () => {
    render(
      <MemoryRouter>
        <AdministrationSecurityPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Authentication")).toBeInTheDocument(),
    );
    expect(screen.getByText("Session controls")).toBeInTheDocument();
    expect(screen.getByText("Security policies")).toBeInTheDocument();
  });
});
