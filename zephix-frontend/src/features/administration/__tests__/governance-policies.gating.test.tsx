/**
 * GOV-BUILD WAVE1 Unit 1 — Policy sentence view gating.
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
    when: {
      text: `When ${code} applies`,
      params: [],
    },
    scope: { tier: "PHASE_GATE", label: "Phase gate" },
    verdict: "WARN",
    release: null,
    source: "bundle",
    isEnabled: true,
    isEvaluable: true,
    notEvaluableReason: null,
    ...overrides,
  };
}

const MOCK_POLICIES: WorkspaceGovernancePolicy[] = [
  buildPolicy("platform.gate.init-to-plan", {
    verdict: "BLOCK",
    source: "workspace",
    when: {
      text: "Initiation completes without an approved charter",
      params: [],
    },
    release: {
      requiredRole: "ORG_ADMIN",
      approvalsRequired: 1,
      label: "Org Admin · 1 approval",
    },
  }),
  buildPolicy("platform.gate.plan-to-exec", {
    verdict: "BLOCK",
    source: "disabled",
    isEnabled: false,
    release: {
      requiredRole: "ORG_ADMIN",
      approvalsRequired: 1,
      label: "Org Admin · 1 approval",
    },
  }),
  buildPolicy("platform.gate.evidence-required", {
    verdict: "BLOCK",
    when: {
      text: "Gate submission is missing required evidence",
      params: [{ key: "minEvidence", label: "Min evidence", value: 2, unit: "items", editable: false }],
    },
    release: {
      requiredRole: "ORG_ADMIN",
      approvalsRequired: 1,
      label: "Org Admin · 1 approval",
    },
  }),
  buildPolicy("risk-threshold-alert", {
    verdict: "WARN",
    isEvaluable: false,
    notEvaluableReason: "Risk engine not installed",
    when: {
      text: "Open risks exceed the threshold",
      params: [{ key: "maxOpenRisks", label: "Max open risks", value: 5, unit: null, editable: false }],
    },
  }),
  buildPolicy("resource-capacity-governance", {
    verdict: "WARN",
    isEvaluable: false,
    notEvaluableReason: "Capacity engine not installed",
  }),
  buildPolicy("platform.gate.exec-to-monitor"),
  buildPolicy("platform.gate.monitor-to-closure"),
  buildPolicy("platform.gate.closure-to-closed"),
  buildPolicy("platform.gate.closeout-remediation-owner", {
    verdict: "WARN",
    when: {
      text: "Closeout remediation owner is missing",
      params: [{ key: "minEvidence", label: "Min evidence", value: 2, unit: null, editable: false }],
    },
  }),
];

describe("GOV-BUILD WAVE1 Unit 1 GovernancePoliciesTable sentence view", () => {
  let policies = [...MOCK_POLICIES];

  beforeEach(() => {
    vi.clearAllMocks();
    policies = MOCK_POLICIES.map((p) => ({ ...p, when: { ...p.when, params: [...p.when.params] } }));
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

  it("renders policies as When/Where/Then/Release sentences with verdict badges", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("governance-policies-table")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(9);

    expect(screen.getByTestId("policy-when-platform.gate.init-to-plan")).toHaveTextContent(
      /Initiation completes without an approved charter/,
    );
    expect(screen.getByTestId("policy-where-platform.gate.init-to-plan")).toHaveTextContent(
      "Phase gate",
    );

    const blockBadge = screen.getByTestId("policy-verdict-platform.gate.init-to-plan");
    expect(blockBadge).toHaveTextContent("Block");
    expect(blockBadge.firstElementChild?.className).toMatch(/red/);

    expect(screen.getByTestId("policy-release-platform.gate.init-to-plan")).toHaveTextContent(
      /Org Admin/,
    );

    const warnBadge = screen.getByTestId("policy-verdict-platform.gate.closeout-remediation-owner");
    expect(warnBadge).toHaveTextContent("Warn");
    expect(warnBadge.firstElementChild?.className).toMatch(/amber/);

    // Release only when verdict is BLOCK
    expect(
      screen.queryByTestId("policy-release-platform.gate.closeout-remediation-owner"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByTestId("policy-param-chip-platform.gate.evidence-required-minEvidence"),
    ).toHaveTextContent(/Min evidence/);
  });

  it("shows not-evaluable reason as a first-class muted state", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-not-armed-risk-threshold-alert")).toHaveTextContent(
        /Risk engine not installed/,
      );
    });
    expect(screen.getByTestId("policy-not-armed-resource-capacity-governance")).toHaveTextContent(
      /Capacity engine not installed/,
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

  it("does not render editable parameter inputs (read-only sentence view)", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("governance-policies-table")).toBeInTheDocument();
    });

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="number"]')).toBeNull();
  });

  it("falls back to legacy columns when when.text is absent (pre-WAVE1 API)", async () => {
    vi.mocked(administrationApi.listWorkspaceGovernancePolicies).mockResolvedValue([
      buildPolicy("platform.gate.init-to-plan", {
        when: { text: "", params: [] },
        verdict: "BLOCK",
        severityEffective: "BLOCK",
        outcome: "BLOCK",
        description: "legacy desc",
        enforcementPoint: "Phase transition",
      }),
      buildPolicy("risk-threshold-alert", {
        when: { text: "", params: [] },
        isEvaluable: false,
        notEvaluableReason: "Risk engine not installed",
        severityEffective: "WARN",
        enforcementPoint: "needs E14 risk engine",
        params: { maxOpenRisks: 5 },
        bundleDefaults: { maxOpenRisks: 3 },
      }),
    ]);

    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("governance-policies-table")).toBeInTheDocument();
    });

    expect(screen.getByRole("columnheader", { name: "Severity" })).toBeInTheDocument();
    expect(screen.getByTestId("policy-severity-platform.gate.init-to-plan")).toHaveTextContent(
      "BLOCK",
    );
    expect(screen.getByTestId("policy-enforcement-platform.gate.init-to-plan")).toHaveTextContent(
      /Enforces:/,
    );
    expect(screen.queryByText(/^Unavailable$/)).not.toBeInTheDocument();
    expect(screen.getByTestId("policy-param-risk-threshold-alert-maxOpenRisks")).toBeInTheDocument();
  });
});
