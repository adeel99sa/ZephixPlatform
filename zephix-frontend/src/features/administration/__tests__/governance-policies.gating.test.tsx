/**
 * W2-F2 — Workspace governance policies admin table gating.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { GovernancePoliciesTable } from "@/features/administration/components/GovernancePoliciesTable";
import { administrationApi } from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
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
  const meta = POLICY_UI_META[code];
  return {
    code,
    name: meta?.displayName ?? code,
    description: meta?.description ?? "",
    scope: "workspace",
    severityEffective: "WARN",
    source: "bundle",
    isEnabled: true,
    params: null,
    bundleDefaults: null,
    ...overrides,
  };
}

const MOCK_POLICIES: WorkspaceGovernancePolicy[] = Object.keys(POLICY_UI_META).map((code, index) =>
  buildPolicy(code, {
    severityEffective: index % 2 === 0 ? "WARN" : "BLOCK",
    source: index === 0 ? "workspace" : index === 1 ? "disabled" : "bundle",
    isEnabled: index !== 1,
    params:
      code === "risk-threshold-alert"
        ? { maxOpenRisks: 5 }
        : code === "wip-limits"
          ? { maxActiveTasks: 10 }
          : null,
    bundleDefaults:
      code === "risk-threshold-alert"
        ? { maxOpenRisks: 3 }
        : code === "deliverable-doc-required"
          ? { minEvidence: 2 }
          : null,
  }),
);

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
          params: body.params ?? policies[idx]!.params,
          source: "workspace" as const,
        };
        policies[idx] = updated;
        return { ...updated };
      },
    );
  });

  it("renders nine policies with severity chips and source indicators", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("governance-policies-table")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("row")).toHaveLength(10); // header + 9 policies

    const warnChip = screen.getByTestId("policy-severity-scope-change-control");
    expect(warnChip).toHaveTextContent("WARN");
    expect(warnChip.className).toMatch(/amber/);

    const blockChip = screen.getByTestId("policy-severity-task-completion-signoff");
    expect(blockChip).toHaveTextContent("BLOCK");
    expect(blockChip.className).toMatch(/red/);

    expect(screen.getByTestId("policy-source-scope-change-control")).toHaveTextContent(
      "Workspace override",
    );
    expect(screen.getByTestId("policy-source-task-completion-signoff")).toHaveTextContent(
      "Disabled",
    );
    expect(screen.getByTestId("policy-source-phase-gate-approval")).toHaveTextContent(
      "Mode default",
    );
  });

  it("toggle calls PUT with optimistic update and rolls back on error", async () => {
    const user = userEvent.setup();
    vi.mocked(administrationApi.updateWorkspaceGovernancePolicy).mockRejectedValueOnce(
      new Error("network"),
    );

    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-toggle-scope-change-control")).toBeInTheDocument();
    });

    const toggle = screen.getByTestId("policy-toggle-scope-change-control") as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    await user.click(toggle);

    await waitFor(() => {
      expect(administrationApi.updateWorkspaceGovernancePolicy).toHaveBeenCalledWith(
        "scope-change-control",
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          isEnabled: false,
        }),
      );
    });

    await waitFor(() => {
      expect((screen.getByTestId("policy-toggle-scope-change-control") as HTMLInputElement).checked).toBe(
        true,
      );
    });
    expect(toast.error).toHaveBeenCalled();
  });

  it("shows numeric param inputs only for configured keys", async () => {
    render(<GovernancePoliciesTable workspaceId={WORKSPACE_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("policy-param-risk-threshold-alert-maxOpenRisks")).toBeInTheDocument();
    });

    expect(screen.getByTestId("policy-param-risk-threshold-alert-maxOpenRisks")).toHaveValue(5);
    expect(screen.getByTestId("policy-param-wip-limits-maxActiveTasks")).toHaveValue(10);
    expect(screen.getByTestId("policy-param-deliverable-doc-required-minEvidence")).toHaveValue(2);
    expect(
      screen.queryByTestId("policy-param-scope-change-control-minEvidence"),
    ).not.toBeInTheDocument();
  });
});
