import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/ui/shell/Sidebar";

const listWorkspacesMock = vi.fn();
const listTemplatesMock = vi.fn();
const getTemplateDetailMock = vi.fn();
const createProjectFromTemplateMock = vi.fn();
const openTemplateCenterMock = vi.fn();

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: { platformRole: "ADMIN" },
  }),
}));

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: null,
    setActiveWorkspace: vi.fn(),
    clearActiveWorkspace: vi.fn(),
  }),
}));

vi.mock("@/state/templateCenterModal.store", () => ({
  useTemplateCenterModalStore: (selector: (s: {
    openTemplateCenter: typeof openTemplateCenterMock;
  }) => unknown) =>
    selector({
      openTemplateCenter: openTemplateCenterMock,
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
  listTemplates: (...args: unknown[]) => listTemplatesMock(...args),
  getTemplateDetail: (...args: unknown[]) => getTemplateDetailMock(...args),
  createProjectFromTemplate: (...args: unknown[]) => createProjectFromTemplateMock(...args),
}));

vi.mock("@/features/projects/api", () => ({
  createProject: vi.fn().mockResolvedValue({ id: "project-1" }),
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

describe("sidebar workspace template trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkspacesMock.mockResolvedValue([{ id: "ws-1", name: "Alpha Workspace" }]);
    listTemplatesMock.mockResolvedValue([]);
    getTemplateDetailMock.mockResolvedValue(null);
    createProjectFromTemplateMock.mockResolvedValue({ id: "project-1", workspaceId: "ws-1" });
  });

  it("opens Template Center modal from workspace row Create new → From Template", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/home"]}>
          <Routes>
            <Route path="/home" element={<Sidebar />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Alpha Workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Collapse Workspaces")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Workspace Settings").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Create Workspace").length).toBeGreaterThan(0);

    const workspaceLabel = screen.getByText("Alpha Workspace");
    const rowGroup = workspaceLabel.closest(".group");
    expect(rowGroup).toBeTruthy();
    fireEvent.mouseEnter(rowGroup!);

    fireEvent.click(screen.getByLabelText("Create new"));
    expect(await screen.findByText("From Template")).toBeInTheDocument();
    fireEvent.click(screen.getByText("From Template"));

    expect(openTemplateCenterMock).toHaveBeenCalledWith("ws-1");
  });
});
