import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdministrationOrganizationPage from "@/features/administration/pages/AdministrationOrganizationPage";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getOrganizationProfile: vi.fn().mockResolvedValue({
      id: "org-1",
      name: "Zephix Org",
      slug: "zephix-org",
      status: "active",
      website: "https://zephix.ai",
      industry: "Technology",
      size: "enterprise",
      description: "Org description",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      planCode: "enterprise",
      planStatus: "active",
      planExpiresAt: null,
      metadataSummary: {
        trialEndsAt: null,
        dataRegion: "us-east-1",
        allowedEmailDomain: "zephix.ai",
      },
      tenantSummary: { totalUsers: 2, totalWorkspaces: 1 },
    }),
    updateOrganizationProfile: vi.fn(),
  },
}));

describe("administration organization page contract", () => {
  it("renders source-backed organization governance fields", async () => {
    render(
      <MemoryRouter>
        <AdministrationOrganizationPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Organization" })).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("Zephix Org")).toBeInTheDocument();
    expect(screen.getByText("zephix-org")).toBeInTheDocument();
    expect(screen.getByText("Save organization profile")).toBeInTheDocument();
  });
});
