import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserProfileDropdown } from "../UserProfileDropdown";

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      email: "admin@zephix.dev",
      firstName: "Admin",
      platformRole: "ADMIN",
    },
    logout: vi.fn(),
  }),
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

describe("administration route interaction", () => {
  it("opens administration console route and does not route to template center", async () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="/home" element={<UserProfileDropdown />} />
          <Route path="/administration" element={<div>Admin Console Route</div>} />
          <Route path="/templates" element={<div>Template Center Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("user-profile-button"));
    fireEvent.click(screen.getByTestId("menu-administration"));

    expect(await screen.findByText("Admin Console Route")).toBeInTheDocument();
    expect(screen.queryByText("Template Center Route")).not.toBeInTheDocument();
  });
});
