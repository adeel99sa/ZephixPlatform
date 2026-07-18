/**
 * FE-GOV-1 — Governance console truth pass gating.
 * Active policies = evaluableActive/total; no classic catalog; workspace picker; activity honesty.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AdministrationGovernancePage from "@/features/administration/pages/AdministrationGovernancePage";
import { administrationApi } from "@/features/administration/api/administration.api";
import type { WorkspaceGovernancePolicy } from "@/features/administration/api/administration.api";
import { resolvePolicyArmedState } from "@/features/administration/constants/governance-policies";

vi.mock("@/state/workspace.store", () => ({
  useWorkspaceStore: (sel: (s: { activeWorkspaceId: string | null }) => unknown) =>
    sel({ activeWorkspaceId: null }),
}));

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    getGovernanceHealth: vi.fn(),
    listPendingDecisions: vi.fn(),
    listGovernanceQueue: vi.fn(),
    listWorkspaces: vi.fn(),
    getGovernancePolicySummary: vi.fn(),
    listRecentActivity: vi.fn(),
    listWorkspaceGovernancePolicies: vi.fn(),
    updateWorkspaceGovernancePolicy: vi.fn(),
  },
}));

const WS_GOVERNED = "ws-governed";
const WS_LEAN = "ws-lean";

function w2Policy(
  code: string,
  overrides: Partial<WorkspaceGovernancePolicy> = {},
): WorkspaceGovernancePolicy {
  return {
    code,
    name: code,
    when: {
      text: `When ${code} applies`,
      params: [],
    },
    scope: { tier: "PHASE_GATE", label: "Phase gate" },
    verdict: "BLOCK",
    release: {
      requiredRole: "ORG_ADMIN",
      approvalsRequired: 1,
      label: "Org Admin · 1 approval",
    },
    source: "bundle",
    isEnabled: true,
    isEvaluable: true,
    notEvaluableReason: null,
    ...overrides,
  };
}

const GOVERNED_POLICIES: WorkspaceGovernancePolicy[] = [
  w2Policy("platform.gate.init-to-plan"),
  w2Policy("platform.gate.plan-to-exec"),
  w2Policy("platform.gate.exec-to-monitor"),
  w2Policy("platform.gate.monitor-to-closure"),
  w2Policy("platform.gate.closure-to-closed"),
  w2Policy("platform.gate.evidence-required"),
  w2Policy("platform.gate.closeout-remediation-owner"),
  w2Policy("risk-threshold-alert", {
    isEvaluable: false,
    notEvaluableReason: "Risk engine not installed (E14)",
    verdict: "WARN",
    release: null,
  }),
  w2Policy("resource-capacity-governance", {
    isEvaluable: false,
    notEvaluableReason: "Capacity engine not installed (E7)",
    verdict: "WARN",
    release: null,
  }),
];

describe("FE-GOV-1 governance console truth pass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(administrationApi.getGovernanceHealth).mockResolvedValue({
      activePolicies: 0,
      capacityWarnings: 0,
      budgetWarnings: 0,
      hardBlocksThisWeek: 0,
    });
    vi.mocked(administrationApi.listPendingDecisions).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 1, total: 0 },
    });
    vi.mocked(administrationApi.listWorkspaces).mockResolvedValue([
      {
        workspaceId: WS_GOVERNED,
        workspaceName: "Governed WS",
        projectCount: 2,
        budgetStatus: "OK",
        capacityStatus: "OK",
        openExceptions: 0,
        owners: [],
        status: "ACTIVE",
      },
      {
        workspaceId: WS_LEAN,
        workspaceName: "Lean WS",
        projectCount: 1,
        budgetStatus: "OK",
        capacityStatus: "OK",
        openExceptions: 0,
        owners: [],
        status: "ACTIVE",
      },
    ]);
    vi.mocked(administrationApi.getGovernancePolicySummary).mockImplementation(async (id) => {
      if (id === WS_LEAN) {
        return {
          workspaceId: WS_LEAN,
          complexityMode: "LEAN",
          total: 9,
          activeCount: 0,
          evaluableActiveCount: 0,
        };
      }
      return {
        workspaceId: WS_GOVERNED,
        complexityMode: "GOVERNED",
        total: 9,
        activeCount: 9,
        evaluableActiveCount: 7,
      };
    });
    vi.mocked(administrationApi.listWorkspaceGovernancePolicies).mockImplementation(async (id) => {
      if (id === WS_LEAN) {
        return GOVERNED_POLICIES.map((p) => ({
          ...p,
          isEnabled: false,
          enabled: false,
          source: "disabled" as const,
          verdict: null,
        }));
      }
      return GOVERNED_POLICIES.map((p) => ({ ...p }));
    });
    vi.mocked(administrationApi.listRecentActivity).mockResolvedValue([]);
  });

  it("GOVERNED workspace shows 7 of 9 enforcing and never calls classic catalog", async () => {
    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("governance-active-policies-metric")).toHaveTextContent(
        "7 of 9 enforcing",
      );
    });

    expect(administrationApi.getGovernancePolicySummary).toHaveBeenCalledWith(WS_GOVERNED);
    // Classic catalog path must not remain in the FE call graph (GOV-FIX-B2 precondition).
  });

  it("LEAN workspace shows 0 of 9 enforcing", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    // Select mounts immediately with the empty placeholder ("No workspaces available").
    // Wait until listWorkspaces resolves and options are real — otherwise CI flakes with
    // Value "ws-lean" not found in options under load.
    await waitFor(() => {
      const select = screen.getByTestId("governance-workspace-select");
      expect(select).not.toBeDisabled();
      expect(
        within(select).getByRole("option", { name: "Lean WS" }),
      ).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId("governance-workspace-select"), WS_LEAN);

    await waitFor(() => {
      expect(screen.getByTestId("governance-active-policies-metric")).toHaveTextContent(
        "0 of 9 enforcing",
      );
    });
  });

  it("shows honest not-evaluable reason for isEvaluable:false policies", async () => {
    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("policy-not-armed-risk-threshold-alert")).toHaveTextContent(
        /Risk engine not installed/,
      );
    });
    expect(screen.getByTestId("policy-not-armed-resource-capacity-governance")).toHaveTextContent(
      /Capacity engine not installed/,
    );
    expect(screen.getByTestId("policy-when-platform.gate.evidence-required")).toHaveTextContent(
      /When platform\.gate\.evidence-required applies/,
    );
    expect(screen.queryByText(/Enforcement coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Coming soon$/i)).not.toBeInTheDocument();
  });

  it("activity empty state is honest when the feed returns []", async () => {
    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("governance-activity-empty")).toHaveTextContent(
        /No recent governance activity/,
      );
    });
  });

  it("renders a real activity row when the feed returns data", async () => {
    vi.mocked(administrationApi.listRecentActivity).mockResolvedValue([
      {
        id: "act-1",
        eventType: "governance.exception.pending",
        description: "GOVERNANCE_RULE — PENDING: missing evidence",
        actorUserId: "user-1",
        timestamp: "2026-07-12T12:00:00.000Z",
        workspaceId: WS_GOVERNED,
      },
    ]);

    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const list = screen.getByTestId("governance-activity-list");
      expect(within(list).getByText("governance.exception.pending")).toBeInTheDocument();
      expect(within(list).getByText(/missing evidence/)).toBeInTheDocument();
    });
  });

  it("surfaces activity API errors instead of an empty state", async () => {
    vi.mocked(administrationApi.listRecentActivity).mockRejectedValue(new Error("boom"));

    render(
      <MemoryRouter>
        <AdministrationGovernancePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("governance-activity-error")).toHaveTextContent(
        /Failed to load recent activity/,
      );
    });
    expect(screen.queryByTestId("governance-activity-empty")).not.toBeInTheDocument();
  });

  it("resolvePolicyArmedState prefers payload isEvaluable", () => {
    expect(
      resolvePolicyArmedState({
        code: "risk-threshold-alert",
        isEvaluable: false,
        enforcementPoint: "needs E14 risk engine",
      }).requiresEngine,
    ).toMatch(/E14/);
    expect(
      resolvePolicyArmedState({
        code: "platform.gate.evidence-required",
        isEvaluable: true,
        enforcementPoint: "Phase gate submission",
      }).enforcementPoint,
    ).toBe("Phase gate submission");
  });
});
