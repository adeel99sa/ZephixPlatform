import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OperationalDashboardPage from "@/features/dashboards/OperationalDashboardPage";

const getCardAdvisoryMock = vi.fn();

vi.mock("@/features/dashboards/api", () => ({
  getDashboardCardsCatalog: vi.fn().mockResolvedValue({
    home: {
      featured: [],
      tasks: [],
      "project-health": [],
      resources: [],
      governance: [],
      "ai-insights": [],
    },
    workspace: {
      featured: [],
      tasks: [],
      "project-health": [],
      resources: [],
      governance: [],
      "ai-insights": [],
    },
  }),
  getHomeOperationalDashboard: vi.fn(),
  getWorkspaceOperationalDashboard: vi.fn().mockResolvedValue({
    id: "dash-1",
    scopeType: "workspace",
    scopeId: "ws-1",
    title: "Workspace Dashboard",
    cards: [
      {
        id: "card-1",
        cardKey: "projects_at_risk",
        title: "Projects At Risk",
        displayType: "metric",
        size: "small",
        data: {
          cardKey: "projects_at_risk",
          scopeType: "workspace",
          scopeId: "ws-1",
          summary: { primaryValue: 2, secondaryLabel: "at-risk projects" },
          displayData: {},
          drilldown: { route: "/projects?filter=at-risk" },
          generatedFromTimestamp: "2026-03-11T00:00:00.000Z",
        },
      },
    ],
  }),
  addHomeDashboardCard: vi.fn(),
  removeHomeDashboardCard: vi.fn(),
  addWorkspaceDashboardCard: vi.fn(),
  removeWorkspaceDashboardCard: vi.fn(),
  getCardAdvisory: (...args: any[]) => getCardAdvisoryMock(...args),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { platformRole: "ADMIN" },
  }),
}));

describe("dashboard card advisory interaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCardAdvisoryMock.mockResolvedValue({
      cardKey: "projects_at_risk",
      advisoryType: "PROJECT_HEALTH_RISK",
      summary: "Projects at risk increased due to delayed milestones.",
      drivers: [
        'Milestone "API Integration" overdue',
        "3 blocked tasks in backend module",
      ],
      visibilityScope: "full",
      affectedEntityCount: 2,
      affectedEntities: [
        { type: "project", id: "p1", name: "Project Alpha" },
        { type: "project", id: "p2", name: "Project Delta" },
      ],
      recommendedActions: ["Review blocked tasks", "Rebalance backend workload"],
      generatedFromTimestamp: "2026-03-11T00:00:00.000Z",
    });
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/workspaces/ws-1/dashboard"]}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/dashboard"
            element={<OperationalDashboardPage scopeType="workspace" />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("opens advisory panel and renders summary", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Projects At Risk")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("advisory-trigger-projects_at_risk"));

    expect(await screen.findByText("Card Advisory")).toBeInTheDocument();
    expect(
      await screen.findByText("Projects at risk increased due to delayed milestones."),
    ).toBeInTheDocument();
    expect(getCardAdvisoryMock).toHaveBeenCalledWith({
      cardKey: "projects_at_risk",
      workspaceId: "ws-1",
    });
  });

  it("shows loading state before advisory resolves", async () => {
    getCardAdvisoryMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                cardKey: "projects_at_risk",
                advisoryType: "PROJECT_HEALTH_RISK",
                summary: "Delayed advisory",
                drivers: [],
                visibilityScope: "full",
                affectedEntityCount: 0,
                affectedEntities: [],
                recommendedActions: [],
                generatedFromTimestamp: null,
              }),
            25,
          ),
        ),
    );
    renderPage();
    await screen.findByText("Projects At Risk");
    fireEvent.click(screen.getByTestId("advisory-trigger-projects_at_risk"));
    expect(await screen.findByText("Loading advisory...")).toBeInTheDocument();
  });

  it("shows no-advisory state", async () => {
    getCardAdvisoryMock.mockResolvedValue({
      cardKey: "projects_at_risk",
      advisoryType: null,
      summary: "No advisory available for this card at this time.",
      drivers: [],
      visibilityScope: "full",
      affectedEntityCount: 0,
      affectedEntities: [],
      recommendedActions: [],
      generatedFromTimestamp: null,
    });
    renderPage();
    await screen.findByText("Projects At Risk");
    fireEvent.click(screen.getByTestId("advisory-trigger-projects_at_risk"));
    expect(
      await screen.findByText("No advisory available for this card at this time."),
    ).toBeInTheDocument();
  });

  it("shows error state and retry control", async () => {
    getCardAdvisoryMock.mockRejectedValueOnce(new Error("advisory error"));
    renderPage();
    await screen.findByText("Projects At Risk");
    fireEvent.click(screen.getByTestId("advisory-trigger-projects_at_risk"));
    expect(await screen.findByText("advisory error")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows restricted redacted view when visibility scope is viewer_restricted", async () => {
    getCardAdvisoryMock.mockResolvedValue({
      cardKey: "projects_at_risk",
      advisoryType: "PROJECT_HEALTH_RISK",
      summary: "Viewer-safe summary",
      drivers: ["Aggregate risk indicator present."],
      visibilityScope: "viewer_restricted",
      affectedEntityCount: 3,
      affectedEntities: [],
      recommendedActions: ["Review visible trends"],
      generatedFromTimestamp: "2026-03-11T00:00:00.000Z",
    });
    renderPage();
    await screen.findByText("Projects At Risk");
    fireEvent.click(screen.getByTestId("advisory-trigger-projects_at_risk"));
    expect(
      await screen.findByText(/Redacted for visibility policy\./),
    ).toBeInTheDocument();
    expect(screen.queryByText("Project Alpha (project)")).not.toBeInTheDocument();
  });
});

