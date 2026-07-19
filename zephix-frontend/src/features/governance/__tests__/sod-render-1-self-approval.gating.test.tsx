/**
 * SOD-RENDER-1 Unit 1 — self-approval labels from API flags only.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  GovernanceExceptionsQueue,
} from "@/features/administration/components/GovernanceExceptionsQueue";
import { administrationApi } from "@/features/administration/api/administration.api";
import { SELF_APPROVED_LABEL } from "@/features/governance/selfApprovalDisplay";
import { formatTaskActivitySentence } from "@/features/work-management/taskActivityFormat";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    listPendingDecisions: vi.fn(),
    listGovernanceQueue: vi.fn(),
    approveException: vi.fn(),
    rejectException: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

describe("SOD-RENDER-1 Unit 1 — self_resolved / selfApproved labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Self-approved beside resolver when selfResolved is true", async () => {
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0 },
    });
    vi.mocked(administrationApi.listGovernanceQueue).mockResolvedValue({
      data: [
        {
          id: "ex-self-1",
          exceptionType: "GOVERNANCE_RULE",
          workspaceId: "ws-1",
          workspaceName: "Cloud Team Test",
          projectId: "proj-1",
          projectName: "Digibot",
          reason: "Self-cleared",
          requestedAt: "2026-07-19T20:00:00.000Z",
          requestedByUserId: "cc8b50df-71ed-42a0-9c48-1216b8643e4e",
          resolvedByUserId: "cc8b50df-71ed-42a0-9c48-1216b8643e4e",
          status: "CONSUMED",
          selfResolved: true,
          ageHours: 1,
          metadata: { policyCodes: ["phase-gate-approval"] },
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    });

    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue workspaceId="ws-1" />
      </MemoryRouter>,
    );

    // Switch to Consumed tab
    const consumed = await screen.findByRole("tab", { name: /Consumed/i });
    consumed.click();

    await waitFor(() => {
      expect(screen.getByTestId("exception-self-resolved-ex-self-1")).toHaveTextContent(
        SELF_APPROVED_LABEL,
      );
    });
    expect(administrationApi.listGovernanceQueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CONSUMED" }),
    );
  });

  it("does not invent Self-approved when selfResolved is false", async () => {
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0 },
    });
    vi.mocked(administrationApi.listGovernanceQueue).mockResolvedValue({
      data: [
        {
          id: "ex-peer-1",
          exceptionType: "GOVERNANCE_RULE",
          workspaceId: "ws-1",
          workspaceName: "GovProofFinal",
          projectId: "proj-1",
          projectName: "Gov Test",
          reason: "Peer resolved",
          requestedAt: "2026-07-19T20:00:00.000Z",
          requestedByUserId: "user-a",
          resolvedByUserId: "user-b",
          status: "CONSUMED",
          selfResolved: false,
          metadata: null,
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    });

    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue workspaceId="ws-1" />
      </MemoryRouter>,
    );
    (await screen.findByRole("tab", { name: /Consumed/i })).click();

    await waitFor(() => {
      expect(screen.getByTestId("governance-exception-row-ex-peer-1")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("exception-self-resolved-ex-peer-1")).not.toBeInTheDocument();
  });

  it("formats gate activity selfApproved from payload only", () => {
    expect(
      formatTaskActivitySentence("GATE_APPROVAL_STEP_APPROVED", "Ada", {
        selfApproved: true,
      }),
    ).toContain(SELF_APPROVED_LABEL);
    expect(
      formatTaskActivitySentence("GATE_APPROVAL_STEP_APPROVED", "Ada", {
        selfApproved: false,
      }),
    ).not.toContain(SELF_APPROVED_LABEL);
    // Never invent from missing flag
    expect(
      formatTaskActivitySentence("GATE_APPROVAL_STEP_APPROVED", "Ada", {}),
    ).not.toContain(SELF_APPROVED_LABEL);
  });
});
