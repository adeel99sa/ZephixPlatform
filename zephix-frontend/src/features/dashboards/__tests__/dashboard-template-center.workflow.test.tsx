import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
import OperationalDashboardPage from "@/features/dashboards/OperationalDashboardPage";
import { DashboardTemplateCenterModal } from "@/features/dashboards/DashboardTemplateCenterModal";

const addWorkspaceDashboardCardMock = vi.fn().mockResolvedValue(undefined);

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
          supportedScopes: ["workspace"],
          defaultDisplayType: "metric",
          defaultSize: "small",
          drilldownRouteTemplate: "/projects",
          resolverKey: "blocked_tasks",
        },
      ],
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
    cards: [],
  }),
  addHomeDashboardCard: vi.fn(),
  removeHomeDashboardCard: vi.fn(),
  addWorkspaceDashboardCard: (...args: any[]) => addWorkspaceDashboardCardMock(...args),
  removeWorkspaceDashboardCard: vi.fn(),
  getCardAdvisory: vi.fn(),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { platformRole: "ADMIN" },
  }),
}));

describe("dashboard template center workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens Dashboard Template Center from Add Card and creates in place", async () => {
    render(
      <MemoryRouter initialEntries={["/workspaces/ws-1/dashboard"]}>
        <Routes>
          <Route
            path="/workspaces/:workspaceId/dashboard"
            element={<OperationalDashboardPage scopeType="workspace" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Workspace Dashboard");
    expect(screen.getByRole("button", { name: "Open dashboard templates" })).toHaveTextContent(
      "Add Card",
    );
    expect(screen.queryByText("+Card")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open dashboard templates" }));
    expect(await screen.findByText("Dashboard Templates")).toBeInTheDocument();
    expect(screen.queryByText("Project Templates")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Blocked Tasks"));
    fireEvent.click(screen.getByRole("button", { name: "Add card" }));

    await waitFor(() => {
      expect(addWorkspaceDashboardCardMock).toHaveBeenCalledWith("ws-1", "blocked_tasks");
      expect(screen.queryByText("Dashboard Templates")).not.toBeInTheDocument();
      expect(screen.getByText("Workspace Dashboard")).toBeInTheDocument();
    });
  });

  it("resets modal selection state after close and reopen", async () => {
    const defs = [
      {
        cardKey: "blocked_tasks",
        title: "Blocked Tasks",
        description: "Tasks blocked beyond threshold.",
        category: "tasks",
        supportedScopes: ["workspace"],
        defaultDisplayType: "metric",
        defaultSize: "small",
        drilldownRouteTemplate: "/projects",
        resolverKey: "blocked_tasks",
      },
    ] as any;

    const Host = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          <DashboardTemplateCenterModal
            open={open}
            definitions={defs}
            existingCardKeys={new Set<string>()}
            onClose={() => setOpen(false)}
            onCreate={async () => {}}
          />
        </>
      );
    };

    render(<Host />);
    fireEvent.click(await screen.findByText("Blocked Tasks"));
    expect(screen.getByRole("button", { name: "Add card" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close modal"));
    fireEvent.click(screen.getByText("open"));
    expect(await screen.findByText("Select a card template to continue.")).toBeInTheDocument();
  });
});

