import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/state/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "a@test.com",
      organizationId: "org-1",
      permissions: { isAdmin: true },
    },
  }),
}));

vi.mock("../components/AccountSettings", () => ({
  AccountSettings: () => (
    <div data-testid="mock-account-settings">Account mock</div>
  ),
}));

vi.mock("../components/WorkspaceSettings", () => ({
  WorkspaceSettings: () => (
    <div data-testid="mock-workspace-settings">Workspace mock</div>
  ),
}));

vi.mock("../components/OrganizationSettings", () => ({
  OrganizationSettings: () => (
    <div data-testid="mock-org-settings">Organization mock</div>
  ),
}));

vi.mock("../../billing/BillingPage", () => ({
  default: () => <div data-testid="mock-billing">Billing mock</div>,
}));

import SettingsPage from "../SettingsPage";

function renderSettings(initialPath = "/settings") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe("SettingsPage", () => {
  it("renders header and tab buttons", () => {
    renderSettings();
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-account")).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-organization")).toBeInTheDocument();
  });

  it("shows Account tab content by default", () => {
    renderSettings();
    expect(screen.getByTestId("mock-account-settings")).toBeInTheDocument();
  });

  it("switches to Organization tab when clicked", () => {
    renderSettings();
    fireEvent.click(screen.getByTestId("settings-tab-organization"));
    expect(screen.getByTestId("mock-org-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-account-settings")).not.toBeInTheDocument();
  });
});
