/**
 * GOV-BUILD WAVE1 Unit 3 — persistent block state + exception requester.
 */
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  GovernanceExceptionsQueue,
  mapPendingDecisionToQueueItem,
} from "@/features/administration/components/GovernanceExceptionsQueue";
import { administrationApi } from "@/features/administration/api/administration.api";
import {
  notifyGovernanceRuleBlocked,
  notifyGovernanceBulkPartialSuccess,
  GOVERNANCE_EXCEPTIONS_ADMIN_PATH,
} from "@/features/work-management/governanceTaskUpdateErrors";
import {
  listGovernanceBlocks,
  parseGovernanceBlockFromError,
} from "@/features/work-management/governanceBlockRecord";
import { GovernanceBlockBanner } from "@/features/work-management/components/GovernanceBlockBanner";
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
  requestedByUserId: "user-1-abcdef01",
  requestedAt: "2026-07-06T02:00:00.000Z",
  ageHours: 80,
  status: "PENDING" as const,
};

const BLOCK_ERROR = {
  response: {
    data: {
      code: "GOVERNANCE_RULE_BLOCKED",
      message: "Task status change blocked",
      policyCodes: ["phase-gate-approval"],
      policyMessages: ["Phase gate must be approved before moving task to Done"],
      exceptionId: "5968e317-aaaa-bbbb-cccc-ddddeeeeffff",
      exceptionStatus: "CREATED",
      submissionId: "sub-1",
      metadata: { phaseId: "ph-1", taskId: "task-1" },
    },
  },
};

describe("W2-C GovernanceExceptionsQueue gating", () => {
  let approved = false;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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

  it("renders PENDING rows and surfaces requester", async () => {
    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("exceptions-queue-list")).toBeInTheDocument();
    });

    expect(administrationApi.listPendingDecisions).toHaveBeenCalled();
    expect(screen.getByTestId("exception-policy-code")).toHaveTextContent("PHASE_GATE");
    expect(screen.getByTestId(`exception-requester-${PENDING_DECISION.id}`)).toHaveTextContent(
      /Requested by/,
    );
    expect(screen.getByTestId("exception-pending-age")).toHaveTextContent("3d");
  });

  it("mapPendingDecisionToQueueItem preserves ageHours and requester", () => {
    const row = mapPendingDecisionToQueueItem(PENDING_DECISION);
    expect(row.ageHours).toBe(80);
    expect(row.requestedByUserId).toBe(PENDING_DECISION.requestedByUserId);
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

describe("GOV-BUILD WAVE1 Unit 3 — persistent block + View status navigates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    setAuthPlatformRole("MEMBER");
  });

  it("persists block record and renders banner that survives remount", async () => {
    const projectId = "4ba319ba-2ae8-4d20-9fba-3a49090e9041";
    act(() => {
      notifyGovernanceRuleBlocked(BLOCK_ERROR, { projectId, workspaceId: "ws-1" });
    });

    expect(listGovernanceBlocks({ projectId })).toHaveLength(1);
    expect(toast.error).toHaveBeenCalledWith(
      "Action blocked by governance",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View status" }),
      }),
    );

    const { unmount } = render(
      <MemoryRouter>
        <GovernanceBlockBanner projectId={projectId} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("governance-block-banner")).toBeInTheDocument();
    expect(screen.getByTestId(`governance-block-policy-${PENDING_DECISION.id}`)).toHaveTextContent(
      /Phase gate approval/i,
    );
    expect(screen.getByTestId(`governance-block-waiting-${PENDING_DECISION.id}`)).toHaveTextContent(
      /Organization admin/,
    );

    unmount();

    render(
      <MemoryRouter>
        <GovernanceBlockBanner projectId={projectId} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("governance-block-banner")).toBeInTheDocument();
  });

  it("View status navigates to gate panel for members (not a second toast)", () => {
    const projectId = "4ba319ba-2ae8-4d20-9fba-3a49090e9041";
    notifyGovernanceRuleBlocked(BLOCK_ERROR, { projectId, workspaceId: "ws-1" });

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
    expect(assignMock).toHaveBeenCalledWith(
      expect.stringContaining(`/work/projects/${projectId}/plan?phaseId=ph-1`),
    );
    expect(toast.message).not.toHaveBeenCalled();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: prior,
    });
  });

  it("admin View status navigates to exceptions admin path", () => {
    setAuthPlatformRole("ADMIN");
    notifyGovernanceRuleBlocked(BLOCK_ERROR, {
      projectId: "4ba319ba-2ae8-4d20-9fba-3a49090e9041",
    });

    const call = vi.mocked(toast.error).mock.calls[0]?.[1] as {
      action?: { onClick?: () => void };
    };
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

  it("parseGovernanceBlockFromError does not invent policy language", () => {
    const record = parseGovernanceBlockFromError(BLOCK_ERROR, {
      projectId: "p1",
      workspaceId: "w1",
    });
    expect(record?.reason).toBe("Phase gate must be approved before moving task to Done");
    expect(record?.policyCodes).toEqual(["phase-gate-approval"]);
  });

  it("bulk partial success keeps View status navigation", () => {
    notifyGovernanceBulkPartialSuccess({
      updated: 2,
      blockedCount: 1,
      projectId: "p1",
    });

    expect(toast.warning).toHaveBeenCalledWith(
      "1 task blocked by governance; 2 updated.",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View status" }),
      }),
    );
  });
});
