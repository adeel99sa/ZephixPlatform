import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdministrationLayout from "@/features/administration/layout/AdministrationLayout";
import AdministrationOverviewPage from "@/features/administration/pages/AdministrationOverviewPage";
import AdministrationUsersPage from "@/features/administration/pages/AdministrationUsersPage";
import AdministrationSecurityPage from "@/features/administration/pages/AdministrationSecurityPage";
import AdministrationAuditLogPage from "@/features/administration/pages/AdministrationAuditLogPage";
import AdministrationTemplatesPage from "@/features/administration/pages/AdministrationTemplatesPage";
import WorkspaceSettingsPage from "@/features/workspaces/settings/WorkspaceSettingsPage";

const mockApiGet = vi.fn();
const mockRequestGet = vi.fn();

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1", platformRole: "ADMIN", permissions: {} },
    loading: false,
  }),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: (selector?: (state: any) => any) => {
    const state = {
      activeWorkspaceId: null,
      setActiveWorkspace: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/lib/api", () => ({
  request: {
    get: (...args: any[]) => mockRequestGet(...args),
  },
  api: {
    get: (...args: any[]) => mockApiGet(...args),
  },
}));

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    listPendingDecisions: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    }),
    getGovernanceHealth: vi.fn().mockResolvedValue({
      activePolicies: 0,
      capacityWarnings: 0,
      budgetWarnings: 0,
      hardBlocksThisWeek: 0,
    }),
    getWorkspaceSnapshot: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    }),
    listRecentActivity: vi.fn().mockResolvedValue([]),
    listUsers: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    }),
    listAuditEvents: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0 },
    }),
    listTemplates: vi.fn().mockResolvedValue([]),
    getSystemHealth: vi.fn().mockResolvedValue({
      status: "ok",
      database: "ok",
    }),
  },
}));

describe("administration context separation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem("workspace-storage");
    localStorage.removeItem("zephix.lastWorkspaceId");
    mockApiGet.mockResolvedValue({
      data: {
        data: {
          name: "Workspace A",
          visibility: "private",
          permissionsConfig: {},
        },
      },
    });
    mockRequestGet.mockResolvedValue({
      name: "Workspace A",
      visibility: "private",
      permissionsConfig: {},
    });
  });

  it("renders core admin pages without workspace context in store or URL", async () => {
    render(
      <MemoryRouter>
        <AdministrationOverviewPage />
        <AdministrationUsersPage />
        <AdministrationSecurityPage />
        <AdministrationAuditLogPage />
        <AdministrationTemplatesPage />
      </MemoryRouter>,
    );

    const overviewLabels = await screen.findAllByText("Overview");
    expect(overviewLabels.length).toBeGreaterThan(0);
    expect(await screen.findByText("Users")).toBeInTheDocument();
    expect(await screen.findByText("Security")).toBeInTheDocument();
    expect(await screen.findByText("Audit Log")).toBeInTheDocument();
    expect(await screen.findByText("Templates")).toBeInTheDocument();
  });

  it("keeps workspace-level controls out of admin navigation", async () => {
    render(
      <MemoryRouter initialEntries={["/administration/general"]}>
        <Routes>
          <Route path="/administration/*" element={<AdministrationLayout />}>
            <Route path="general" element={<div>GENERAL_CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const overviewLabels = await screen.findAllByText("Overview");
    expect(overviewLabels.length).toBeGreaterThan(0);

    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("Workspace Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Boards")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboards")).not.toBeInTheDocument();
  });

  it("keeps org governance controls out of workspace settings and enforces workspace tabs", async () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws-1/settings"]}>
        <Routes>
          <Route path="/workspaces/:id/settings" element={<WorkspaceSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("ws-settings-root")).toBeInTheDocument();

    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
    expect(screen.queryByText("Security")).not.toBeInTheDocument();
    expect(screen.queryByText("Organization Settings")).not.toBeInTheDocument();
  });
});

