/**
 * W2-C — Admin governance exceptions queue gating.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  GovernanceExceptionsQueue,
  mapPendingDecisionToQueueItem,
} from "@/features/administration/components/GovernanceExceptionsQueue";
import { administrationApi } from "@/features/administration/api/administration.api";
import { notifyGovernanceRuleBlocked, notifyGovernanceBulkPartialSuccess, GOVERNANCE_EXCEPTIONS_ADMIN_PATH } from "@/features/work-management/governanceTaskUpdateErrors";
import { toast } from "sonner";
import { setAuthPlatformRole } from "@/state/authContextBridge";

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

const PENDING_DECISION = {
  id: "5968e317-aaaa-bbbb-cccc-ddddeeeeffff",
  type: "PHASE_GATE",
  workspaceId: "84d46f51-7ea4-436c-9af4-ad744a18d29d",
  workspaceName: "GovProofFinal",
  projectId: "4ba319ba-2ae8-4d20-9fba-3a49090e9041",
  projectName: "Gov Test Project",
  reason: "Phase gate must be approved before moving task to Done",
  requestedByUserId: "user-1",
  requestedAt: "2026-07-06T02:00:00.000Z",
  ageHours: 80,
  status: "PENDING" as const,
};

describe("W2-C GovernanceExceptionsQueue gating", () => {
  let approved = false;

  beforeEach(() => {
    vi.clearAllMocks();
    approved = false;
    vi.mocked(administrationApi.listPendingDecisions).mockImplementation(async (params) => {
      const limit = params?.limit ?? 100;
      return {
        data: approved ? [] : [PENDING_DECISION],
        meta: { page: 1, limit, total: approved ? 0 : 1 },
      };
    });
    vi.mocked(administrationApi.listGovernanceQueue).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 100, total: 0 },
    });
    vi.mocked(administrationApi.approveException).mockImplementation(async (id) => {
      approved = true;
      return {
        id,
        status: "APPROVED",
        updatedAt: new Date().toISOString(),
      };
    });
  });

  it("renders PENDING rows from decisions/pending with policy type and ageHours", async () => {
    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("exceptions-queue-list")).toBeInTheDocument();
    });

    expect(administrationApi.listPendingDecisions).toHaveBeenCalled();
    expect(screen.queryByTestId("exception-scope-toggle")).not.toBeInTheDocument();
    expect(screen.getByTestId("exceptions-scope-label")).toHaveTextContent(/all workspaces/);
    expect(screen.getByTestId("exception-policy-code")).toHaveTextContent("PHASE_GATE");
    expect(screen.getByTestId("exception-requested-at")).toBeInTheDocument();
    expect(screen.getByTestId("exception-pending-age")).toHaveTextContent("3d");
    expect(screen.getByTestId(`governance-exception-row-${PENDING_DECISION.id}`).className).toMatch(
      /amber/,
    );
  });

  it("renders fresh pending age from ageHours without amber highlight", async () => {
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [{ ...PENDING_DECISION, ageHours: 12 }],
      meta: { page: 1, limit: 100, total: 1 },
    });

    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("exception-pending-age")).toHaveTextContent("12h");
    });
    expect(screen.getByTestId(`governance-exception-row-${PENDING_DECISION.id}`).className).not.toMatch(
      /amber-300/,
    );
  });

  it("mapPendingDecisionToQueueItem preserves ageHours from API", () => {
    const row = mapPendingDecisionToQueueItem(PENDING_DECISION);
    expect(row.ageHours).toBe(80);
    expect(row.status).toBe("PENDING");
  });

  it("approve calls endpoint and optimistically removes row", async () => {
    const user = userEvent.setup();
    const onPendingCountChange = vi.fn();

    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue onPendingCountChange={onPendingCountChange} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`governance-exception-row-${PENDING_DECISION.id}`)).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("exception-approve-btn"));

    const noteInput = await screen.findByLabelText(/resolution note/i);
    await user.type(noteInput, "Approved for W2-C proof");
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^Approve$/i }));

    await waitFor(() => {
      expect(administrationApi.approveException).toHaveBeenCalledWith(
        PENDING_DECISION.id,
        "Approved for W2-C proof",
      );
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(`governance-exception-row-${PENDING_DECISION.id}`),
      ).not.toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalled();
  });
});

describe("W2-C PM governance toast gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Admin path keeps "View exception" deep-link; MEMBER gets honest status (MP-3).
    setAuthPlatformRole("ADMIN");
  });

  it("CREATED exceptionStatus shows pending-approval copy", () => {
    const handled = notifyGovernanceRuleBlocked({
      response: {
        data: {
          code: "GOVERNANCE_RULE_BLOCKED",
          policyMessages: ["Phase gate must be approved before moving task to Done"],
          exceptionId: "5968e317-aaaa-bbbb-cccc-ddddeeeeffff",
          exceptionStatus: "CREATED",
        },
      },
    });

    expect(handled).toBe(true);
    expect(toast.error).toHaveBeenCalledWith(
      "Governance: Phase gate must be approved before moving task to Done",
      expect.objectContaining({
        description: "An exception request has been sent to your organization admin for review.",
        action: expect.objectContaining({
          label: "View exception",
          onClick: expect.any(Function),
        }),
      }),
    );
  });

  it("exception toast action targets governance exceptions admin path", () => {
    notifyGovernanceRuleBlocked({
      response: {
        data: {
          code: "GOVERNANCE_RULE_BLOCKED",
          exceptionId: "5968e317-aaaa-bbbb-cccc-ddddeeeeffff",
          exceptionStatus: "CREATED",
        },
      },
    });

    const call = vi.mocked(toast.error).mock.calls[0]?.[1] as {
      action?: { label?: string; onClick?: () => void };
    };
    expect(call?.action?.label).toBe("View exception");
    const assignMock = vi.fn();
    const prior = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...prior, assign: assignMock },
    });
    call?.action?.onClick?.();
    expect(assignMock).toHaveBeenCalledWith(GOVERNANCE_EXCEPTIONS_ADMIN_PATH);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: prior,
    });
  });

  it("bulk partial success toast includes View exception action", () => {
    notifyGovernanceBulkPartialSuccess({ updated: 2, blockedCount: 1 });

    expect(toast.warning).toHaveBeenCalledWith(
      "1 task blocked by governance; 2 updated.",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View exception" }),
      }),
    );
  });

  it("PENDING exceptionStatus shows already-pending copy", () => {
    notifyGovernanceRuleBlocked({
      response: {
        data: {
          code: "GOVERNANCE_RULE_BLOCKED",
          exceptionId: "5968e317-aaaa-bbbb-cccc-ddddeeeeffff",
          exceptionStatus: "PENDING",
        },
      },
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        description: "An exception request is already pending organization admin review.",
      }),
    );
  });

  it("MEMBER View status CTA does not navigate to admin exceptions path", () => {
    setAuthPlatformRole("MEMBER");
    notifyGovernanceRuleBlocked({
      response: {
        data: {
          code: "GOVERNANCE_RULE_BLOCKED",
          exceptionId: "5968e317-aaaa-bbbb-cccc-ddddeeeeffff",
          exceptionStatus: "CREATED",
        },
      },
    });

    const call = vi.mocked(toast.error).mock.calls[0]?.[1] as {
      action?: { label?: string; onClick?: () => void };
    };
    expect(call?.action?.label).toBe("View status");
    const assignMock = vi.fn();
    const prior = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...prior, assign: assignMock },
    });
    call?.action?.onClick?.();
    expect(assignMock).not.toHaveBeenCalled();
    expect(toast.message).toHaveBeenCalledWith(
      "Exception requested — pending admin review",
      expect.any(Object),
    );
    Object.defineProperty(window, "location", {
      configurable: true,
      value: prior,
    });
  });
});
