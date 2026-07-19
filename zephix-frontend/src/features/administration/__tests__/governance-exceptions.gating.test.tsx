/**
 * W2-C exceptions queue + GOV-BUILD WAVE1 Unit 3 block banner.
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
import { parseGovernanceBlockFromError } from "@/features/work-management/governanceBlockRecord";
import { GovernanceBlockBanner } from "@/features/work-management/components/GovernanceBlockBanner";
import * as overviewExceptions from "@/features/projects/components/ProjectOverviewExceptions";
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
        <GovernanceExceptionsQueue workspaceId={PENDING_DECISION.workspaceId} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("exceptions-queue-list")).toBeInTheDocument();
    });

    expect(administrationApi.listPendingDecisions).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: PENDING_DECISION.workspaceId }),
    );
    expect(screen.getByTestId("exceptions-scope-label")).toHaveTextContent(/this workspace/);
    expect(screen.getByTestId("exception-policy-code")).toHaveTextContent("PHASE_GATE");
    expect(screen.getByTestId("exception-requested-at")).toBeInTheDocument();
    expect(screen.getByTestId("exception-pending-age")).toHaveTextContent("3d");
    expect(screen.getByTestId(`governance-exception-row-${PENDING_DECISION.id}`).className).toMatch(
      /amber/,
    );
  });

  it("All workspaces scope omits workspaceId filter", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue workspaceId={PENDING_DECISION.workspaceId} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("exception-scope-org")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("exception-scope-org"));

    await waitFor(() => {
      expect(administrationApi.listPendingDecisions).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: undefined }),
      );
    });
    expect(screen.getByTestId("exceptions-scope-label")).toHaveTextContent(/all workspaces/);
  });

  it("renders fresh pending age from ageHours without amber highlight", async () => {
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [{ ...PENDING_DECISION, ageHours: 12 }],
      meta: { page: 1, limit: 100, total: 1 },
    });

    render(
      <MemoryRouter>
        <GovernanceExceptionsQueue workspaceId={PENDING_DECISION.workspaceId} />
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
        <GovernanceExceptionsQueue
          workspaceId={PENDING_DECISION.workspaceId}
          onPendingCountChange={onPendingCountChange}
        />
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
    sessionStorage.clear();
    // Unit 3: toast is flash-only; live status lives on the project/exceptions API.
    setAuthPlatformRole("ADMIN");
  });

  it("block toast uses API reason and View status action", () => {
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
      "Action blocked by governance",
      expect.objectContaining({
        description: "Phase gate must be approved before moving task to Done",
        action: expect.objectContaining({
          label: "View status",
          onClick: expect.any(Function),
        }),
      }),
    );
  });

  it("admin View status targets governance exceptions admin path", () => {
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
    expect(assignMock).toHaveBeenCalledWith(GOVERNANCE_EXCEPTIONS_ADMIN_PATH);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: prior,
    });
  });

  it("bulk partial success toast includes View status action", () => {
    notifyGovernanceBulkPartialSuccess({ updated: 2, blockedCount: 1 });

    expect(toast.warning).toHaveBeenCalledWith(
      "1 task blocked by governance; 2 updated.",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View status" }),
      }),
    );
  });
});

describe("GOV-BUILD WAVE1 Unit 3 — API-backed block banner + View status navigates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    setAuthPlatformRole("MEMBER");
  });

  it("banner loads open exceptions from the project API (not sessionStorage)", async () => {
    const projectId = "4ba319ba-2ae8-4d20-9fba-3a49090e9041";
    const workspaceId = "ws-1";
    const fetchSpy = vi.spyOn(overviewExceptions, "fetchOpenExceptionsForProject").mockResolvedValue([
      {
        id: PENDING_DECISION.id,
        exceptionType: "GOVERNANCE_RULE",
        status: "PENDING",
        reason: "Phase gate must be approved before moving task to Done",
        policyName: "Phase gate approval",
        policyCodes: ["phase-gate-approval"],
        requestedBy: "user-1-abcdef01",
        phaseId: "ph-1",
        taskId: "task-1",
        requiredToClear:
          "Complete the phase-gate evidence checklist and obtain organization admin approval.",
        waitingOn: "Organization admin",
      },
    ]);

    render(
      <MemoryRouter>
        <GovernanceBlockBanner projectId={projectId} workspaceId={workspaceId} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("governance-block-banner")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledWith({ projectId, workspaceId });
    expect(screen.getByTestId(`governance-block-policy-${PENDING_DECISION.id}`)).toHaveTextContent(
      /Phase gate approval/i,
    );
    expect(screen.getByTestId(`governance-block-status-${PENDING_DECISION.id}`)).toHaveTextContent(
      "PENDING",
    );

    fetchSpy.mockResolvedValueOnce([]);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => {
      expect(screen.queryByTestId("governance-block-banner")).not.toBeInTheDocument();
    });
  });

  it("notify emits refetch signal; toast View status navigates (not a second toast)", () => {
    const projectId = "4ba319ba-2ae8-4d20-9fba-3a49090e9041";
    const changed = vi.fn();
    window.addEventListener("governance-block:changed", changed);
    notifyGovernanceRuleBlocked(BLOCK_ERROR, { projectId, workspaceId: "ws-1" });
    expect(changed).toHaveBeenCalled();
    window.removeEventListener("governance-block:changed", changed);

    expect(toast.error).toHaveBeenCalledWith(
      "Action blocked by governance",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View status" }),
      }),
    );

    const call = vi.mocked(toast.error).mock.calls[0]?.[1] as {
      action?: { label?: string; onClick?: () => void };
    };
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
