/**
 * Walkthrough fix — Heatmap must never Navigate to /workspaces
 * (WorkspacesIndexPage auto-redirects single-workspace orgs to /inbox).
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/features/resources/api/useResources", () => ({
  useResourceHeatmap: vi.fn(() => ({
    data: { resources: [], dates: [], cells: [] },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/components/resources/ResourceHeatmapGrid", () => ({
  ResourceHeatmapGrid: () => <div data-testid="heatmap-grid" />,
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock("@/features/workspaces/api", () => ({
  listWorkspaces: vi.fn(async () => [{ id: "ws-1", name: "WS One" }]),
}));

vi.mock("@/features/workspaces/WorkspaceCreateModal", () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", platformRole: "ADMIN" } }),
}));

import { ResourceHeatmapPage } from "@/pages/resources/ResourceHeatmapPage";
import { useWorkspaceStore } from "@/state/workspace.store";

describe("ResourceHeatmapPage — no /workspaces bounce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows workspace picker when no workspace (does not navigate to /workspaces or /inbox)", () => {
    vi.mocked(useWorkspaceStore).mockImplementation((sel: any) =>
      sel({ activeWorkspaceId: null }),
    );

    render(
      <MemoryRouter initialEntries={["/heatmap"]}>
        <Routes>
          <Route path="/heatmap" element={<ResourceHeatmapPage />} />
          <Route path="/workspaces" element={<div data-testid="workspaces-index">Workspaces</div>} />
          <Route path="/inbox" element={<div data-testid="inbox-page">Inbox</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("workspace-required-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("workspaces-index")).not.toBeInTheDocument();
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
  });

  it("renders heatmap page when active workspace is set", () => {
    vi.mocked(useWorkspaceStore).mockImplementation((sel: any) =>
      sel({ activeWorkspaceId: "ws-1" }),
    );

    render(
      <MemoryRouter initialEntries={["/heatmap"]}>
        <Routes>
          <Route path="/heatmap" element={<ResourceHeatmapPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("resource-heatmap-page")).toBeInTheDocument();
    expect(screen.getByTestId("heatmap-empty-resources")).toBeInTheDocument();
  });
});
