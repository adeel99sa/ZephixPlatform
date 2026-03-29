import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OperationalDashboardPage from "@/features/dashboards/OperationalDashboardPage";

const getDashboardCardsCatalogMock = vi.fn();
const getHomeOperationalDashboardMock = vi.fn();
const getWorkspaceOperationalDashboardMock = vi.fn();
const addHomeDashboardCardMock = vi.fn();
const addWorkspaceDashboardCardMock = vi.fn();
const removeHomeDashboardCardMock = vi.fn();
const removeWorkspaceDashboardCardMock = vi.fn();
const authState = {
  user: { platformRole: "MEMBER" as const },
};

vi.mock("@/features/dashboards/api", () => ({
  getDashboardCardsCatalog: (...args: any[]) => getDashboardCardsCatalogMock(...args),
  getHomeOperationalDashboard: (...args: any[]) => getHomeOperationalDashboardMock(...args),
  getWorkspaceOperationalDashboard: (...args: any[]) =>
    getWorkspaceOperationalDashboardMock(...args),
  addHomeDashboardCard: (...args: any[]) => addHomeDashboardCardMock(...args),
  addWorkspaceDashboardCard: (...args: any[]) => addWorkspaceDashboardCardMock(...args),
  removeHomeDashboardCard: (...args: any[]) => removeHomeDashboardCardMock(...args),
  removeWorkspaceDashboardCard: (...args: any[]) =>
    removeWorkspaceDashboardCardMock(...args),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => authState,
}));

describe("home surface contract", () => {
  const renderHomeScope = () =>
    render(
      <MemoryRouter>
        <OperationalDashboardPage scopeType="home" />
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { platformRole: "MEMBER" };
    getDashboardCardsCatalogMock.mockResolvedValue({ home: {}, workspace: {} });
    getHomeOperationalDashboardMock.mockResolvedValue({
      scopeType: "home",
      scopeId: "home",
      title: "Home Dashboard",
      cards: [],
    });
  });

  it("renders compatibility wrapper for home scope", async () => {
    renderHomeScope();
    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Home surface has moved")).toBeInTheDocument();
  });

  it("does not expose home quick actions in dashboard compatibility wrapper", async () => {
    renderHomeScope();
    expect(screen.queryByText("My Work Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Inbox Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("Workspace Snapshot")).not.toBeInTheDocument();
  });

  it("does not expose admin handoff from dashboard home compatibility wrapper", async () => {
    authState.user = { platformRole: "ADMIN" };
    renderHomeScope();
    expect(await screen.findByText("Home surface has moved")).toBeInTheDocument();
    expect(screen.queryByText("Admin Console")).not.toBeInTheDocument();
  });

  it("keeps wrapper read-only for viewer role", async () => {
    authState.user = { platformRole: "VIEWER" };
    renderHomeScope();
    expect(await screen.findByText("Home surface has moved")).toBeInTheDocument();
    expect(screen.queryByText("Admin Console")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open dashboard templates/i })).not.toBeInTheDocument();
  });
});

