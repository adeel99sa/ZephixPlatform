import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdministrationTeamsPage from "@/features/administration/pages/AdministrationTeamsPage";
import { teamsApi } from "@/features/admin/teams/api/teamsApi";

vi.mock("@/features/admin/teams/api/teamsApi", () => ({
  teamsApi: {
    getTeams: vi.fn().mockResolvedValue([
      {
        id: "team-1",
        name: "Platform Team",
        shortCode: "PLATFORM",
        color: null,
        visibility: "public",
        description: null,
        workspaceId: null,
        status: "active",
        memberCount: 4,
        projectCount: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ]),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    deleteTeam: vi.fn(),
  },
}));

describe("administration teams page contract", () => {
  it("renders source-backed teams list", async () => {
    render(
      <MemoryRouter>
        <AdministrationTeamsPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument(),
    );
    expect(screen.getByText("Platform Team")).toBeInTheDocument();
    expect(screen.getByText("Create team")).toBeInTheDocument();
    expect(vi.mocked(teamsApi.getTeams)).toHaveBeenCalledWith({
      status: "active",
    });
  });
});
