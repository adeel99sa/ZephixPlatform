/**
 * SESSION-FRONTEND-1 Item 5 — Policy sentence view (When / Where / Then / Release).
 * Field precedence: verdict / when.params / state. Ignore outcome, severityEffective, top-level params.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GovernancePoliciesTable } from "@/features/administration/components/GovernancePoliciesTable";
import { administrationApi } from "@/features/administration/api/administration.api";
import type { WorkspaceGovernancePolicy } from "@/features/administration/api/administration.api";
import { toast } from "sonner";

vi.mock("@/features/administration/api/administration.api", () => ({
  administrationApi: {
    listWorkspaceGovernancePolicies: vi.fn(),
    updateWorkspaceGovernancePolicy: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const WORKSPACE_ID = "84d46f51-7ea4-436c-9af4-ad744a18d29d";

function buildPolicy(
  code: string,
  overrides: Partial<WorkspaceGovernancePolicy> = {},
): WorkspaceGovernancePolicy {
  return {
    code,
    name: code,
    humanLabel: code,
    description: "desc",
    scope: { tier: "workspace", label: "Workspace — PMO" },
    enforcementPoint: "Phase transition",
    // Legacy fields — must NOT drive the sentence view
    outcome: "WARN",
    severityEffective: "WARN",
    source: "bundle",
    isEnabled: true,
    enabled: true,
    isEvaluable: true,
    params: { maxOpenRisks: 99 },
    bundleDefaults: null,
    when: {
      text: "When open risks exceed the threshold",
      params: [],
    },
    verdict: "BLOCK",
    release: {
      requiredRole: "workspace_owner",
      approvalsRequired: 1,
      label: "Workspace owner can release",
    },
    state: "ENFORCING",
    stateReason: null,
    ...overrides,
  };
}

const MOCK_POLICIES: WorkspaceGovernancePolicy[] = [
  buildPolicy("platform.gate.init-to-plan", {
    when: { text: "When moving from Initiate to Plan", params: [] },
    verdict: "BLOCK",
  }),
  buildPolicy("platform.gate.plan-to-exec", {
    when: { text: "When moving from Plan to Execute", params: [] },
    verdict: "BLOCK",
    state: "DISABLED",
    stateReason: "Turned off by your admin",
    isEnabled: false,
    enabled: false,
    source: "disabled",
  }),
  buildPolicy("risk-threshold-alert", {
    when: {
      text: "When open risks exceed 5",
      params: [
        {
          key: "max_open_risks",
          label: "Max open risks",
          value: 5,
          unit: "risks",
          editable: false,
          min: 1,
          max: 50,
        },
      ],
    },
    // Deliberately mismatched legacy fields — UI must ignore these
    outcome: "BLOCK",
    severityEffective: "BLOCK",
    params: { maxOpenRisks: 99 },
    verdict: "WARN",
    release: null,
    state: "NOT_EVALUABLE",
    stateReason: "Capacity engine not enabled",
    isEvaluable: false,
  }),
  buildPolicy("platform.gate.closeout-remediation-owner", {
    when: {
      text: "When closeout requires remediation owner",
      params: [
        {
          key: "min_evidence",
          label: "Min evidence",
          value: 2,
          unit: null,
          editable: false,
          min: 1,
          max: 10,
        },
      ],
    },
    verdict: "BLOCK",
  }),
  buildPolicy("platform.gate.evidence-required"),
  buildPolicy("platform.gate.exec-to-monitor"),
  buildPolicy("platform.gate.monitor-to-closure"),
  buildPolicy("platform.gate.closure-to-closed"),
  buildPolicy("resource-capacity-governance", {
    verdict: "WARN",
    release: null,
    state: "NOT_EVALUABLE",
    stateReason: "Capacity engine not enabled",
    isEvaluable: false,
  }),
];

describe("GovernancePoliciesTable sentence view", () => {
  let policies = [...MOCK_POLICIES];

  beforeEach(() => {
    vi.clearAllMocks();
    policies = MOCK_POLICIES.map((p) => ({ ...p }));
    vi.mocked(administrationApi.listWorkspaceGovernancePolicies).mockImplementation(async () =>
      policies.map((p) => ({ ...p })),
    );
    vi.mocked(administrationApi.updateWorkspaceGovernancePolicy).mockImplementation(
      async (code, body) => {
        const idx = policies.findIndex((p) => p.code === code);
        if (idx === -1) throw new Error("not found");
        const updated = {
          ...policies[idx]!,
          isEnabled: body.isEnabled,
          enabled: body.isEnabled,
          source: "workspace" as const,
        };
        policies[idx] = updated;
        return { ...updated };
      },
    );
  });

  it("renders When / Where / Then / Release from sentence-view fields", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("governance-policies-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("policy-when-platform.gate.init-to-plan")).toHaveTextContent(
      "When moving from Initiate to Plan",
    );
    expect(screen.getByTestId("policy-where-platform.gate.init-to-plan")).toHaveTextContent(
      "Workspace — PMO",
    );
    expect(screen.getByTestId("policy-verdict-platform.gate.init-to-plan")).toHaveTextContent("Block");
    expect(screen.getByTestId("policy-release-platform.gate.init-to-plan")).toHaveTextContent(
      "Workspace owner can release",
    );
  });

  it("reads verdict not outcome/severityEffective; params from when.params not top-level", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-verdict-risk-threshold-alert")).toBeInTheDocument();
    });

    // Legacy outcome/severityEffective were BLOCK; contract verdict is WARN
    expect(screen.getByTestId("policy-verdict-risk-threshold-alert")).toHaveTextContent("Warn");
    expect(screen.queryByTestId("policy-severity-risk-threshold-alert")).not.toBeInTheDocument();

    // Chip from when.params (5 risks), not top-level params (99)
    const chip = screen.getByTestId("policy-param-chip-risk-threshold-alert-max_open_risks");
    expect(chip).toHaveTextContent("5 risks");
    expect(chip).not.toHaveTextContent("99");
  });

  it("renders DISABLED and NOT_EVALUABLE with stateReason; mutes NOT_EVALUABLE when.text", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-state-platform.gate.plan-to-exec")).toBeInTheDocument();
    });

    expect(screen.getByTestId("policy-state-platform.gate.plan-to-exec")).toHaveTextContent(
      /Turned off by your admin/,
    );
    expect(screen.getByTestId("policy-state-risk-threshold-alert")).toHaveTextContent(
      /Capacity engine not enabled/,
    );

    const when = screen.getByTestId("policy-when-risk-threshold-alert");
    expect(when.className).toMatch(/text-neutral-400/);
  });

  it("shows Release only when verdict is BLOCK", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-verdict-risk-threshold-alert")).toBeInTheDocument();
    });

    expect(screen.getByTestId("policy-release-platform.gate.init-to-plan")).toHaveTextContent(
      /Workspace owner/,
    );
    // WARN → no release label cell content beyond em dash (parent td)
    const warnRow = screen.getByTestId("governance-policy-row-risk-threshold-alert");
    expect(warnRow.textContent).not.toMatch(/Workspace owner can release/);
  });

  it("toggle calls PUT with optimistic update and rolls back on error", async () => {
    const user = userEvent.setup();
    vi.mocked(administrationApi.updateWorkspaceGovernancePolicy).mockRejectedValueOnce(
      new Error("network"),
    );

    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-toggle-platform.gate.init-to-plan")).toBeInTheDocument();
    });

    const toggle = screen.getByTestId(
      "policy-toggle-platform.gate.init-to-plan",
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    await user.click(toggle);

    await waitFor(() => {
      expect(administrationApi.updateWorkspaceGovernancePolicy).toHaveBeenCalledWith(
        "platform.gate.init-to-plan",
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          isEnabled: false,
        }),
      );
    });

    await waitFor(() => {
      expect(
        (screen.getByTestId("policy-toggle-platform.gate.init-to-plan") as HTMLInputElement)
          .checked,
      ).toBe(true);
    });
    expect(toast.error).toHaveBeenCalled();
  });
});
