/**
 * SESSION-FRONTEND-1 Item 2 PR A — RequireWorkspace shows empty state
 * instead of silently redirecting to /inbox.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequireWorkspace from "@/routes/RequireWorkspace";
import { useWorkspaceStore } from "@/state/workspace.store";

vi.mock("@/features/workspaces/api", () => ({
  listWorkspaces: vi.fn(),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", platformRole: "ADMIN", firstName: "A", lastName: "Admin" },
    isLoading: false,
  }),
}));

vi.mock("@/utils/access", () => ({
  canCreateOrgWorkspace: () => false,
}));

vi.mock("@/features/workspaces/WorkspaceCreateModal", () => ({
  WorkspaceCreateModal: () => null,
}));

import { listWorkspaces } from "@/features/workspaces/api";

describe("RequireWorkspace — no silent redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    // Treat store as hydrated so the gate does not return null.
    const persist = useWorkspaceStore.persist as { hasHydrated?: () => boolean } | undefined;
    if (persist) {
      persist.hasHydrated = () => true;
    }
    vi.mocked(listWorkspaces).mockResolvedValue([
      { id: "ws-1", name: "Alpha Workspace", description: null } as never,
    ]);
  });

  it("renders in-page empty state on /capacity when no workspace (does not navigate to inbox)", async () => {
    render(
      <MemoryRouter initialEntries={["/capacity"]}>
        <Routes>
          <Route element={<RequireWorkspace />}>
            <Route path="/capacity" element={<div data-testid="capacity-page">Capacity</div>} />
          </Route>
          <Route path="/inbox" element={<div data-testid="inbox-page">Inbox</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("workspace-required-empty")).toBeInTheDocument();
    expect(screen.getByText(/Select a workspace to view capacity/i)).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("capacity-page")).not.toBeInTheDocument();
  });

  it("selecting a workspace reveals the child route without leaving the URL", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/heatmap"]}>
        <Routes>
          <Route element={<RequireWorkspace />}>
            <Route path="/heatmap" element={<div data-testid="heatmap-page">Heatmap</div>} />
          </Route>
          <Route path="/inbox" element={<div data-testid="inbox-page">Inbox</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("workspace-required-empty")).toBeInTheDocument();
    await user.click(await screen.findByTestId("workspace-required-pick-ws-1"));

    await waitFor(() => {
      expect(screen.getByTestId("heatmap-page")).toBeInTheDocument();
    });
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("ws-1");
    expect(screen.queryByTestId("inbox-page")).not.toBeInTheDocument();
  });

  it("passes through to Outlet when a workspace is already active", () => {
    useWorkspaceStore.setState({ activeWorkspaceId: "ws-active" });
    render(
      <MemoryRouter initialEntries={["/capacity"]}>
        <Routes>
          <Route element={<RequireWorkspace />}>
            <Route path="/capacity" element={<div data-testid="capacity-page">Capacity</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("capacity-page")).toBeInTheDocument();
    expect(screen.queryByTestId("workspace-required-empty")).not.toBeInTheDocument();
  });
});
