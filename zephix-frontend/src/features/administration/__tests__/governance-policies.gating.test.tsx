/**
 * W2-F2 — Workspace governance policies admin table gating.
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
    scope: "PHASE_GATE",
    enforcementPoint: "Phase transition",
    outcome: "WARN",
    severityEffective: "WARN",
    source: "bundle",
    isEnabled: true,
    enabled: true,
    isEvaluable: true,
    params: null,
    bundleDefaults: null,
    ...overrides,
  };
}

const MOCK_POLICIES: WorkspaceGovernancePolicy[] = [
  buildPolicy("platform.gate.init-to-plan", {
    severityEffective: "BLOCK",
    outcome: "BLOCK",
    source: "workspace",
  }),
  buildPolicy("platform.gate.plan-to-exec", {
    severityEffective: "BLOCK",
    outcome: "BLOCK",
    source: "disabled",
    isEnabled: false,
    enabled: false,
  }),
  buildPolicy("platform.gate.evidence-required", {
    severityEffective: "BLOCK",
    outcome: "BLOCK",
    enforcementPoint: "Phase gate submission (evidence required)",
  }),
  buildPolicy("risk-threshold-alert", {
    severityEffective: "WARN",
    outcome: "WARN",
    isEvaluable: false,
    enforcementPoint: "Task status change — needs openRiskCount (E14 risk engine, not yet supplied)",
    params: { maxOpenRisks: 5 },
    bundleDefaults: { maxOpenRisks: 3 },
  }),
  buildPolicy("resource-capacity-governance", {
    severityEffective: "WARN",
    outcome: "WARN",
    isEvaluable: false,
    enforcementPoint: "Task → In Progress — needs activeTaskCount (E7 capacity engine, not yet supplied)",
  }),
  buildPolicy("platform.gate.exec-to-monitor"),
  buildPolicy("platform.gate.monitor-to-closure"),
  buildPolicy("platform.gate.closure-to-closed"),
  buildPolicy("platform.gate.closeout-remediation-owner", {
    params: { minEvidence: 2 },
    bundleDefaults: { minEvidence: 2 },
  }),
];

describe("W2-F2 GovernancePoliciesTable gating", () => {
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
          params: body.params ?? policies[idx]!.params,
          source: "workspace" as const,
        };
        policies[idx] = updated;
        return { ...updated };
      },
    );
  });

  it("renders nine policies with severity chips, source, and honesty labels", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("governance-policies-table")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("row")).toHaveLength(10); // header + 9 policies

    const blockChip = screen.getByTestId("policy-severity-platform.gate.init-to-plan");
    expect(blockChip).toHaveTextContent("BLOCK");
    expect(blockChip.className).toMatch(/red/);

    expect(screen.getByTestId("policy-source-platform.gate.init-to-plan")).toHaveTextContent(
      "Workspace override",
    );
    expect(screen.getByTestId("policy-source-platform.gate.plan-to-exec")).toHaveTextContent(
      "Disabled",
    );
    expect(screen.getByTestId("policy-enforcement-platform.gate.evidence-required")).toHaveTextContent(
      /Enforces:/,
    );
    expect(screen.getByTestId("policy-not-armed-risk-threshold-alert")).toHaveTextContent(
      /Not yet armed — requires E14/,
    );
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

  it("shows numeric param inputs only for configured keys", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-param-risk-threshold-alert-maxOpenRisks")).toBeInTheDocument();
    });

    expect(screen.getByTestId("policy-param-risk-threshold-alert-maxOpenRisks")).toHaveValue(5);
    expect(
      screen.getByTestId("policy-param-platform.gate.closeout-remediation-owner-minEvidence"),
    ).toHaveValue(2);
  });
});
