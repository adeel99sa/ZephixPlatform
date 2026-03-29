import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/ui/shell/Sidebar";
import { createSidebarTestWrapper } from "@/test/sidebar-test-utils";

const authState: { user: { platformRole: string } } = {
  user: { platformRole: "ADMIN" },
};
const listWorkspacesMock = vi.fn();

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => authState,
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

vi.mock("@/features/workspaces/api", () => ({
  listWorkspaces: (...args: unknown[]) => listWorkspacesMock(...args),
}));

vi.mock("@/features/templates/api", () => ({
  listTemplates: vi.fn().mockResolvedValue([]),
  getTemplateDetail: vi.fn().mockResolvedValue(null),
  createProjectFromTemplate: vi.fn(),
}));

vi.mock("@/features/projects/api", () => ({
  createProject: vi.fn().mockResolvedValue({ id: "p-1" }),
}));

vi.mock("@/features/workspaces/WorkspaceCreateModal", () => ({
  WorkspaceCreateModal: () => null,
}));

vi.mock("@/features/workspaces/components/WorkspaceShareModal", () => ({
  WorkspaceShareModal: () => null,
}));

vi.mock("@/features/workspaces/components/TemplateSelectionModal", () => ({
  TemplateSelectionModal: () => null,
}));

vi.mock("@/features/workspaces/components/WorkspaceMemberInviteModal", () => ({
  WorkspaceMemberInviteModal: () => null,
}));

describe("sidebar role visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { platformRole: "ADMIN" };
    listWorkspacesMock.mockResolvedValue([{ id: "ws-1", name: "Workspace One" }]);
  });

  it("shows workspace create affordances for admins", async () => {
    render(<Sidebar />, {
      wrapper: createSidebarTestWrapper({ initialEntries: ["/home"] }),
    });
    expect(await screen.findByLabelText("Create Workspace")).toBeInTheDocument();
  });

  it("hides org workspace create affordances for members", async () => {
    authState.user = { platformRole: "MEMBER" };
    render(<Sidebar />, {
      wrapper: createSidebarTestWrapper({ initialEntries: ["/home"] }),
    });
    expect(await screen.findByText("Workspace One")).toBeInTheDocument();
    expect(screen.queryByLabelText("Create Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("New Workspace")).not.toBeInTheDocument();
  });

  it("hides org workspace create affordances for viewers", async () => {
    authState.user = { platformRole: "VIEWER" };
    render(<Sidebar />, {
      wrapper: createSidebarTestWrapper({ initialEntries: ["/home"] }),
    });
    expect(await screen.findByText("Workspace One")).toBeInTheDocument();
    expect(screen.queryByLabelText("Create Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("New Workspace")).not.toBeInTheDocument();
  });
});
