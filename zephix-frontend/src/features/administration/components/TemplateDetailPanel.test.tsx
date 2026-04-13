import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TemplateDetailPanel } from "./TemplateDetailPanel";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getTemplateGovernance: vi.fn(),
    updateTemplateGovernance: vi.fn(),
  },
}));

import { administrationApi } from "@/features/administration/api/administration.api";

const baseTemplate = {
  id: "tpl-1",
  name: "Waterfall Sample",
  status: "APPROVED" as const,
  updatedAt: new Date().toISOString(),
  updatedByUserId: null as string | null,
  methodology: "WATERFALL",
};

describe("TemplateDetailPanel governance tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows actionable empty state when governance catalog is empty", async () => {
    const user = userEvent.setup();
    vi.mocked(administrationApi.getTemplateGovernance).mockResolvedValue([]);

    render(
      <TemplateDetailPanel template={baseTemplate} onClose={() => undefined} />,
    );

    await user.click(screen.getByRole("button", { name: "governance" }));

    await waitFor(() => {
      expect(screen.getByText("No system policy catalog loaded")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Run pending backend migrations/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/npm run db:migrate/i)).toBeInTheDocument();
  });

  it("shows policy toggles when catalog returns rows", async () => {
    const user = userEvent.setup();
    vi.mocked(administrationApi.getTemplateGovernance).mockResolvedValue([
      {
        code: "phase-gate-approval",
        name: "Phase gate approval",
        entityType: "PHASE_GATE",
        enforcementMode: "OFF",
        enabled: false,
        ruleDefinition: {},
        systemRuleSetId: "sys-1",
        templateRuleSetId: null,
      },
    ]);

    render(
      <TemplateDetailPanel template={baseTemplate} onClose={() => undefined} />,
    );

    await user.click(screen.getByRole("button", { name: "governance" }));

    await waitFor(() => {
      expect(screen.getByText("Phase gate approval")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("switch", { name: /Enable Phase gate approval/i }),
    ).toBeInTheDocument();
  });
});
