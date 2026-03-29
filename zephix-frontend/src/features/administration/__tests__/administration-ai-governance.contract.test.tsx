import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdministrationAIGovernancePage from "@/features/administration/pages/AdministrationAIGovernancePage";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getAIGovernanceSummary: vi.fn(),
    getAIGovernanceUsage: vi.fn(),
  },
}));

import { administrationApi } from "@/features/administration/api/administration.api";

describe("administration ai governance contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders advisory-only governance summary from source-backed contract", async () => {
    vi.mocked(administrationApi.getAIGovernanceSummary).mockResolvedValue({
      aiEnabled: true,
      advisoryOnly: true,
      policyVersion: "AI_ADVISORY_V2",
      dataTrainingStatement:
        "No customer workspace content is used here for autonomous model-driven mutation.",
      roleAccess: [
        {
          role: "ADMIN",
          aiAdvisoryAccess: "allowed_with_workspace_access",
          visibilityMode: "full_context",
        },
        {
          role: "VIEWER",
          aiAdvisoryAccess: "allowed_with_workspace_access",
          visibilityMode: "redacted_viewer",
        },
      ],
      workspaceRoleAccess: [
        { role: "workspace_owner", hierarchyRank: 3, canReadAdvisory: true },
      ],
      policyNotes: [
        "AI in Zephix is advisory-only and does not persist mutations automatically.",
      ],
      editableControls: {
        policyEditingEnabled: false,
        reason: "No admin policy settings contract exists in this phase.",
      },
    });
    vi.mocked(administrationApi.getAIGovernanceUsage).mockResolvedValue({
      windowDays: 30,
      totalEvents: 11,
      advisoryEvents: 8,
      cardAdvisoryEvents: 3,
      uniqueActors: 4,
      workspaceCoverage: 2,
      mode: "read_only",
    });

    render(
      <MemoryRouter>
        <AdministrationAIGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "AI Governance" })).toBeInTheDocument(),
    );

    expect(screen.getByText("Mode: Advisory-only")).toBeInTheDocument();
    expect(screen.getByText(/AI_ADVISORY_V2/)).toBeInTheDocument();
    expect(screen.getByText("Read-only in this phase. No admin policy settings contract exists in this phase.")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText("redacted_viewer")).toBeInTheDocument();
  });
});
