import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import OperationalDashboardPage from "@/features/dashboards/OperationalDashboardPage";
import { getWorkspaceDashboardRoute } from "@/features/navigation/workspace-routes";

let dashboardState: any;
const addWorkspaceDashboardCardMock = vi.fn(async (_workspaceId: string, cardKey: string) => {
  if (cardKey === "blocked_tasks") {
    dashboardState = {
      ...dashboardState,
      cards: [
        ...dashboardState.cards,
        {
          id: "card-2",
          cardKey: "blocked_tasks",
          title: "Blocked Tasks",
          displayType: "metric",
          size: "small",
          data: {
            cardKey: "blocked_tasks",
            scopeType: "workspace",
            scopeId: "ws-1",
            summary: { primaryValue: 2, secondaryLabel: "blocked tasks" },
            displayData: {},
            drilldown: { route: "/projects?filter=blocked" },
            generatedFromTimestamp: "2026-03-11T00:00:00.000Z",
          },
        },
      ],
    };
  }
});

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
      tasks: [
        {
          cardKey: "blocked_tasks",
          title: "Blocked Tasks",
          description: "Tasks blocked beyond threshold.",
          category: "tasks",
        },
      ],
      "project-health": [],
      resources: [],
      governance: [],
      "ai-insights": [],
    },
  }),
  getHomeOperationalDashboard: vi.fn(),
  getWorkspaceOperationalDashboard: vi.fn(async () => dashboardState),
  addHomeDashboardCard: vi.fn(),
  removeHomeDashboardCard: vi.fn(),
  addWorkspaceDashboardCard: (...args: any[]) => addWorkspaceDashboardCardMock(...args),
  removeWorkspaceDashboardCard: vi.fn(),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { platformRole: "ADMIN" },
  }),
}));

describe("workspace dashboard interaction workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardState = {
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
            summary: { primaryValue: 1, secondaryLabel: "at-risk projects" },
            displayData: { projectIds: ["project-visible"] },
            drilldown: { route: "/projects?filter=at-risk" },
            generatedFromTimestamp: "2026-03-11T00:00:00.000Z",
          },
        },
      ],
    };
  });

  function WorkspaceLauncher() {
    const navigate = useNavigate();
    return (
      <button
        onClick={() => navigate(getWorkspaceDashboardRoute("ws-1"))}
      >
        Alpha Workspace
      </button>
    );
  }

  it("supports workspace click -> dashboard -> +Card -> drilldown flow", async () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<WorkspaceLauncher />} />
          <Route
            path="/workspaces/:workspaceId/dashboard"
            element={<OperationalDashboardPage scopeType="workspace" />}
          />
          <Route path="/projects" element={<div>Projects drilldown</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("Alpha Workspace"));

    await waitFor(() => {
      expect(screen.getByText("Workspace Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Projects At Risk")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard templates" }));
    expect(await screen.findByText("Dashboard Templates")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Blocked Tasks"));
    fireEvent.click(screen.getByRole("button", { name: "Add card" }));

    await waitFor(() => {
      expect(addWorkspaceDashboardCardMock).toHaveBeenCalledWith("ws-1", "blocked_tasks");
      expect(screen.getByText("Blocked Tasks")).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByText("View details");
    fireEvent.click(detailButtons[0]);

    expect(await screen.findByText("Projects drilldown")).toBeInTheDocument();
  });
});
