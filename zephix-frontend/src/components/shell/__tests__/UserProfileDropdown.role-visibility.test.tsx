import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserProfileDropdown } from "@/components/shell/UserProfileDropdown";

const authState: { user: any; logout: ReturnType<typeof vi.fn> } = {
  user: {
    id: "user-1",
    email: "admin@zephix.dev",
    firstName: "Admin",
    platformRole: "ADMIN",
  },
  logout: vi.fn(),
};

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({
    currentOrganization: { id: "org-1", name: "Zephix Org" },
    organizations: [{ id: "org-1", name: "Zephix Org" }],
    getUserOrganizations: vi.fn(),
  }),
}));

vi.mock("@/state/workspace.store", () => {
  const state = {
    activeWorkspaceId: "ws-1",
    clearActiveWorkspace: vi.fn(),
  };
  const useWorkspaceStore: any = (selector?: (input: any) => any) =>
    selector ? selector(state) : state;
  useWorkspaceStore.getState = () => state;
  return { useWorkspaceStore };
});

vi.mock("@/lib/telemetry", () => ({
  track: vi.fn(),
}));

describe("user profile dropdown role visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Administration entry for admin", () => {
    authState.user = {
      id: "admin-1",
      email: "admin@zephix.dev",
      firstName: "Admin",
      platformRole: "ADMIN",
    };
    render(
      <MemoryRouter>
        <UserProfileDropdown />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("user-profile-button"));
    expect(screen.getByTestId("menu-administration")).toBeInTheDocument();
  });

  it("hides Administration entry for member and viewer", () => {
    authState.user = {
      id: "member-1",
      email: "member@zephix.dev",
      firstName: "Member",
      platformRole: "MEMBER",
    };
    const { rerender } = render(
      <MemoryRouter>
        <UserProfileDropdown />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("user-profile-button"));
    expect(screen.queryByTestId("menu-administration")).not.toBeInTheDocument();

    authState.user = {
      id: "viewer-1",
      email: "viewer@zephix.dev",
      firstName: "Viewer",
      platformRole: "VIEWER",
    };
    rerender(
      <MemoryRouter>
        <UserProfileDropdown />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("user-profile-button"));
    expect(screen.queryByTestId("menu-administration")).not.toBeInTheDocument();
  });
});
