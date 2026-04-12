import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdministrationOverviewPage from "../AdministrationOverviewPage";
import AdministrationGovernancePage from "../AdministrationGovernancePage";
import AdministrationUsersPage from "../AdministrationUsersPage";
import { AdministrationWorkspacesPanel } from "../../components/AdministrationWorkspacesPanel";
import AdministrationTemplatesPage from "../AdministrationTemplatesPage";
import AdministrationBillingPage from "../AdministrationBillingPage";

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
    changeUserRole: vi.fn(),
    deactivateUser: vi.fn(),
    inviteUsers: vi.fn(),
    listWorkspaces: vi.fn(),
    listTemplates: vi.fn(),
    getBillingSummary: vi.fn(),
    getBillingInvoices: vi.fn(),
  },
}));

import { administrationApi } from "@/features/administration/api/administration.api";

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

  it("renders workspaces panel and templates pages with API empty states", async () => {
    render(
      <MemoryRouter>
        <AdministrationWorkspacesPanel isActive />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("No workspaces yet.")).toBeInTheDocument(),
    );

    render(
      <MemoryRouter>
        <AdministrationTemplatesPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("No templates available.")).toBeInTheDocument(),
    );
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
});
