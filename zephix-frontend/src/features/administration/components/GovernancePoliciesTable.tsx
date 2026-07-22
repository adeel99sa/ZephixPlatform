import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  administrationApi,
  type PolicyState,
  type PolicyWhenParam,
  type WorkspaceGovernancePolicy,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";
import { severityChipClass } from "@/features/administration/utils/governance-policy-display";

export type GovernancePoliciesTableProps = {
  workspaceId: string | null;
};

function policyName(policy: WorkspaceGovernancePolicy): string {
  return (
    policy.humanLabel?.trim() ||
    policy.name?.trim() ||
    POLICY_UI_META[policy.code]?.displayName ||
    policy.code
  );
}

/** Prefer Unit 5 `scope.label`; never invent from enforcement category. */
function scopeLabel(policy: WorkspaceGovernancePolicy): string {
  if (typeof policy.scope === "object" && policy.scope !== null) {
    const label = policy.scope.label?.trim();
    if (label) return label;
  }
  return "—";
}

/**
 * Field precedence (SESSION-FRONTEND-1): read `verdict` only.
 * Do not fall back to outcome / severityEffective for display.
 */
function policyVerdict(
  policy: WorkspaceGovernancePolicy,
): "ALLOW" | "WARN" | "BLOCK" | null {
  if (policy.verdict === "ALLOW" || policy.verdict === "WARN" || policy.verdict === "BLOCK") {
    return policy.verdict;
  }
  return null;
}

function resolveState(policy: WorkspaceGovernancePolicy): PolicyState | null {
  if (
    policy.state === "ENFORCING" ||
    policy.state === "DISABLED" ||
    policy.state === "NOT_EVALUABLE"
  ) {
    return policy.state;
  }
  return null;
}

function formatParamChip(param: PolicyWhenParam): string {
  const unit = param.unit?.trim();
  return unit ? `${param.value} ${unit}` : String(param.value);
}

function verdictBadgeLabel(verdict: "ALLOW" | "WARN" | "BLOCK"): string {
  if (verdict === "ALLOW") return "Allow";
  if (verdict === "WARN") return "Warn";
  return "Block";
}

export function GovernancePoliciesTable({
  workspaceId,
}: GovernancePoliciesTableProps): JSX.Element {
  const [policies, setPolicies] = useState<WorkspaceGovernancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    if (!workspaceId) {
      setPolicies([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = await administrationApi.listWorkspaceGovernancePolicies(workspaceId);
      setPolicies(rows);
    } catch {
      setPolicies([]);
      setError("Failed to load workspace policies.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  const handleToggle = async (policy: WorkspaceGovernancePolicy): Promise<void> => {
    if (!workspaceId) return;

    const nextEnabled = !policy.isEnabled;
    const previous = policies;
    setPolicies((rows) =>
      rows.map((row) =>
        row.code === policy.code ? { ...row, isEnabled: nextEnabled } : row,
      ),
    );
    setSavingCode(policy.code);

    try {
      const updated = await administrationApi.updateWorkspaceGovernancePolicy(policy.code, {
        workspaceId,
        isEnabled: nextEnabled,
      });
      setPolicies((rows) =>
        rows.map((row) => (row.code === policy.code ? updated : row)),
      );
    } catch {
      setPolicies(previous);
      toast.error("Failed to update policy. Changes were reverted.");
    } finally {
      setSavingCode(null);
    }
  };

  if (!workspaceId) {
    return (
      <div
        className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600"
        data-testid="governance-policies-no-workspace"
      >
        Select a workspace above to configure governance policies.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="governance-policies-loading">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        <span className="ml-2 text-sm text-neutral-600">Loading policies…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm font-medium text-neutral-900" data-testid="governance-policies-error">
        {error}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">Workspace policies</h2>
        <p className="mt-1 text-xs text-neutral-600">
          When → Where → Then → Release for each policy. Sentences come from the server.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left" data-testid="governance-policies-table">
          <thead>
            <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-2">Policy</th>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Where</th>
              <th className="px-4 py-2">Then</th>
              <th className="px-4 py-2">Release</th>
              <th className="px-4 py-2 text-right">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => {
              const state = resolveState(policy);
              const verdict = policyVerdict(policy);
              const muted = state === "DISABLED" || state === "NOT_EVALUABLE";
              const whenText = policy.when?.text?.trim() || null;
              const whenParams = policy.when?.params ?? [];
              const releaseLabel =
                verdict === "BLOCK" ? policy.release?.label?.trim() || null : null;

              return (
                <tr
                  key={policy.code}
                  className={cn(
                    "border-b border-neutral-100 align-top",
                    muted && "bg-neutral-50/80",
                  )}
                  data-testid={`governance-policy-row-${policy.code}`}
                  data-policy-state={state ?? undefined}
                >
                  <td className="px-4 py-3">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        muted ? "text-neutral-500" : "text-neutral-900",
                      )}
                    >
                      {policyName(policy)}
                    </p>
                    {state && state !== "ENFORCING" ? (
                      <p
                        className="mt-1 text-xs text-neutral-500"
                        data-testid={`policy-state-${policy.code}`}
                      >
                        <span className="font-medium uppercase tracking-wide">
                          {state === "DISABLED" ? "Disabled" : "Not evaluable"}
                        </span>
                        {policy.stateReason?.trim()
                          ? ` — ${policy.stateReason.trim()}`
                          : null}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className={cn(
                        "text-xs",
                        // 4.5: NOT_EVALUABLE when.text must read muted; DISABLED row is also muted (4.4).
                        muted ? "text-neutral-400" : "text-neutral-700",
                      )}
                      data-testid={`policy-when-${policy.code}`}
                    >
                      {whenText ?? "—"}
                    </p>
                    {whenParams.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {whenParams.map((param) => (
                          <span
                            key={param.key}
                            className={cn(
                              "inline-flex rounded border px-2 py-0.5 text-xs",
                              muted
                                ? "border-neutral-200 bg-neutral-100 text-neutral-500"
                                : "border-neutral-200 bg-white text-neutral-700",
                            )}
                            title={param.label}
                            data-testid={`policy-param-chip-${policy.code}-${param.key}`}
                          >
                            {formatParamChip(param)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs",
                        muted ? "text-neutral-400" : "text-neutral-700",
                      )}
                      data-testid={`policy-where-${policy.code}`}
                    >
                      {scopeLabel(policy)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {verdict ? (
                      <span
                        className={cn(
                          "inline-flex rounded border px-2 py-0.5 text-xs font-medium",
                          muted
                            ? "border-neutral-200 bg-neutral-100 text-neutral-500"
                            : severityChipClass(verdict),
                        )}
                        data-testid={`policy-verdict-${policy.code}`}
                      >
                        {verdictBadgeLabel(verdict)}
                      </span>
                    ) : (
                      <span
                        className="text-xs text-neutral-400"
                        data-testid={`policy-verdict-${policy.code}`}
                      >
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {releaseLabel ? (
                      <span
                        className={cn(
                          "text-xs",
                          muted ? "text-neutral-400" : "text-neutral-700",
                        )}
                        data-testid={`policy-release-${policy.code}`}
                      >
                        {releaseLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <Switch
                        checked={policy.isEnabled}
                        disabled={savingCode === policy.code}
                        aria-label={`Toggle ${policyName(policy)}`}
                        data-testid={`policy-toggle-${policy.code}`}
                        onChange={() => {
                          void handleToggle(policy);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {policies.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-600" data-testid="governance-policies-empty">
          No policies returned for this workspace.
        </p>
      ) : null}
    </section>
  );
}
