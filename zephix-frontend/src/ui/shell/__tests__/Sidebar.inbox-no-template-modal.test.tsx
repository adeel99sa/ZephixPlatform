import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "@/ui/shell/Sidebar";
import { createSidebarTestWrapper } from "@/test/sidebar-test-utils";

const listWorkspacesMock = vi.fn();

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { platformRole: "ADMIN" },
  }),
}));

vi.mock("@/features/workspaces/api", () => ({
  listWorkspaces: (...args: any[]) => listWorkspacesMock(...args),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: null,
    setActiveWorkspace: vi.fn(),
    clearActiveWorkspace: vi.fn(),
  }),
}));

vi.mock("@/state/favorites.store", () => ({
  useFavoritesStore: () => ({
    items: [],
    addFavorite: vi.fn(),
    isFavorite: vi.fn().mockReturnValue(false),
    removeFavorite: vi.fn(),
  }),
}));

vi.mock("@/features/templates/api", () => ({
  listTemplates: vi.fn().mockResolvedValue([]),
  getTemplateDetail: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/features/workspaces/WorkspaceCreateModal", () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock("@/features/workspaces/components/WorkspaceMemberInviteModal", () => ({
  WorkspaceMemberInviteModal: () => null,
}));

vi.mock("@/features/workspaces/components/WorkspaceShareModal", () => ({
  WorkspaceShareModal: () => null,
}));

vi.mock("@/features/workspaces/components/TemplateSelectionModal", () => ({
  TemplateSelectionModal: () => null,
}));

vi.mock("@/features/projects/api", () => ({
  createProject: vi.fn().mockResolvedValue({ id: "p-1" }),
}));

describe("sidebar inbox trigger safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkspacesMock.mockResolvedValue([{ id: "ws-1", name: "Alpha Workspace" }]);
  });

  it("does not open any template modal when clicking Inbox", async () => {
    render(<Sidebar />, {
      wrapper: createSidebarTestWrapper({ initialEntries: ["/home"] }),
    });

    fireEvent.click(screen.getByText("Inbox"));
    expect(screen.queryByText("Project Templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard Templates")).not.toBeInTheDocument();
  });
});

