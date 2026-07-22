/**
 * SESSION-FRONTEND-1 Item 2B — Import/Export hang when no workspace.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceIntegrationsPage } from "@/features/integrations/WorkspaceIntegrationsPage";
import { useWorkspaceStore } from "@/state/workspace.store";

vi.mock("@/features/integrations/integrations.api", () => ({
  listConnections: vi.fn().mockResolvedValue([]),
  testSlack: vi.fn(),
  disableConnection: vi.fn(),
  enableConnection: vi.fn(),
  deleteConnection: vi.fn(),
}));

vi.mock("@/features/workspaces/api", () => ({
  listWorkspaces: vi.fn().mockResolvedValue([
    { id: "ws-1", name: "Alpha", description: null },
  ]),
}));

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", platformRole: "ADMIN" },
    isLoading: false,
  }),
}));

vi.mock("@/utils/access", () => ({
  canCreateOrgWorkspace: () => false,
}));

vi.mock("@/features/workspaces/WorkspaceCreateModal", () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock("@/lib/telemetry", () => ({
  trackBeta: vi.fn(),
}));

describe("WorkspaceIntegrationsPage — no hang without workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    const persist = useWorkspaceStore.persist as { hasHydrated?: () => boolean } | undefined;
    if (persist) persist.hasHydrated = () => true;
  });

  it("shows workspace empty state instead of an infinite spinner when no workspaceId", async () => {
    render(
      <MemoryRouter>
        <WorkspaceIntegrationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("workspace-required-empty")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("integrations-page")).not.toBeInTheDocument();
  });
});
