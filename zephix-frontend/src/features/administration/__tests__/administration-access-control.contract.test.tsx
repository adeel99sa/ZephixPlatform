import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdministrationAccessControlPage from "@/features/administration/pages/AdministrationAccessControlPage";
import { administrationApi } from "@/features/administration/api/administration.api";

const { CANONICAL_ACCESS_CONTROL_SUMMARY } = vi.hoisted(() => ({
  CANONICAL_ACCESS_CONTROL_SUMMARY: {
  platformRoles: [
    {
      role: "ADMIN",
      canCreateWorkspaces: true,
      canManageOrganizationGovernance: true,
      defaultAccessMode: "read_write",
    },
    {
      role: "VIEWER",
      canCreateWorkspaces: false,
      canManageOrganizationGovernance: false,
      defaultAccessMode: "read_only",
    },
  ],
  workspaceRoles: [
    {
      role: "workspace_owner",
      hierarchyRank: 3,
      mutable: true,
    },
  ],
  roleMappings: [{ legacyRole: "pm", normalizedRole: "MEMBER" }],
  policyNotes: [
    "Platform role is the source of truth for organization-level access.",
  ],
  },
}));

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getAccessControlSummary: vi.fn().mockResolvedValue(
      CANONICAL_ACCESS_CONTROL_SUMMARY,
    ),
  },
}));

describe("administration access control page contract", () => {
  it("renders role matrix and policy notes from backend summary", async () => {
    render(
      <MemoryRouter>
        <AdministrationAccessControlPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Access Control" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Platform Roles")).toBeInTheDocument();
    expect(screen.getByText("Legacy Role Mapping")).toBeInTheDocument();
    expect(screen.getByText("pm → MEMBER")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Platform role is the source of truth for organization-level access.",
      ),
    ).toBeInTheDocument();
    expect(vi.mocked(administrationApi.getAccessControlSummary)).toHaveBeenCalled();
  });
});
