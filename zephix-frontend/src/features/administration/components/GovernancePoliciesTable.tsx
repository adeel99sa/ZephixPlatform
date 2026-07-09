import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  administrationApi,
  type WorkspaceGovernancePolicy,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";
import {
  isNumericPolicyParamKey,
  NUMERIC_POLICY_PARAM_KEYS,
  severityChipClass,
  sourceIndicatorLabel,
  type NumericPolicyParamKey,
} from "@/features/administration/utils/governance-policy-display";

export type GovernancePoliciesTableProps = {
  workspaceId: string | null;
};

function policyDescription(policy: WorkspaceGovernancePolicy): string {
  return (
    policy.description?.trim() ||
    POLICY_UI_META[policy.code]?.description ||
    ""
  );
}

function policyName(policy: WorkspaceGovernancePolicy): string {
  return policy.name?.trim() || POLICY_UI_META[policy.code]?.displayName || policy.code;
}

function numericParamValue(
  params: Record<string, unknown> | null | undefined,
  bundleDefaults: Record<string, unknown> | null | undefined,
  key: NumericPolicyParamKey,
): number | "" {
  const raw = params?.[key] ?? bundleDefaults?.[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return "";
}

export function GovernancePoliciesTable({
  workspaceId,
}: GovernancePoliciesTableProps): JSX.Element {
  const [policies, setPolicies] = useState<WorkspaceGovernancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [paramDrafts, setParamDrafts] = useState<
    Record<string, Partial<Record<NumericPolicyParamKey, string>>>
  >({});

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
      setParamDrafts({});
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

  const handleParamBlur = async (
    policy: WorkspaceGovernancePolicy,
    key: NumericPolicyParamKey,
    rawValue: string,
  ): Promise<void> => {
    if (!workspaceId) return;
    if (rawValue.trim() === "") return;

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    const current = numericParamValue(policy.params, policy.bundleDefaults, key);
    if (current === parsed) return;

    const previous = policies;
    const nextParams = { ...(policy.params ?? {}), [key]: parsed };
    setPolicies((rows) =>
      rows.map((row) =>
        row.code === policy.code ? { ...row, params: nextParams, source: "workspace" as const } : row,
      ),
    );
    setSavingCode(`${policy.code}:${key}`);

    try {
      const updated = await administrationApi.updateWorkspaceGovernancePolicy(policy.code, {
        workspaceId,
        isEnabled: policy.isEnabled,
        params: nextParams,
      });
      setPolicies((rows) =>
        rows.map((row) => (row.code === policy.code ? updated : row)),
      );
      setParamDrafts((drafts) => {
        const next = { ...drafts };
        const rowDrafts = { ...(next[policy.code] ?? {}) };
        delete rowDrafts[key];
        if (Object.keys(rowDrafts).length === 0) {
          delete next[policy.code];
        } else {
          next[policy.code] = rowDrafts;
        }
        return next;
      });
    } catch {
      setPolicies(previous);
      toast.error("Failed to save policy parameter.");
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
        Select a workspace from the shell to configure governance policies.
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
          Nine governance policies for the active workspace. Toggle enforcement and adjust numeric thresholds.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left" data-testid="governance-policies-table">
          <thead>
            <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-2">Policy</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Parameters</th>
              <th className="px-4 py-2 text-right">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => {
              const editableParams = NUMERIC_POLICY_PARAM_KEYS.filter((key) =>
                isNumericPolicyParamKey(key) &&
                (policy.params?.[key] != null || policy.bundleDefaults?.[key] != null),
              );

              return (
                <tr
                  key={policy.code}
                  className="border-b border-neutral-100 align-top"
                  data-testid={`governance-policy-row-${policy.code}`}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-neutral-900">{policyName(policy)}</p>
                    <p className="mt-1 text-xs text-neutral-600">{policyDescription(policy)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded border px-2 py-0.5 text-xs font-medium uppercase",
                        severityChipClass(policy.severityEffective),
                      )}
                      data-testid={`policy-severity-${policy.code}`}
                    >
                      {policy.severityEffective}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs text-neutral-700"
                      data-testid={`policy-source-${policy.code}`}
                    >
                      {sourceIndicatorLabel(policy.source)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editableParams.length === 0 ? (
                      <span className="text-xs text-neutral-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {editableParams.map((key) => {
                          const draft = paramDrafts[policy.code]?.[key];
                          const resolved = numericParamValue(policy.params, policy.bundleDefaults, key);
                          const displayValue =
                            draft !== undefined ? draft : resolved === "" ? "" : String(resolved);
                          return (
                            <label key={key} className="flex items-center gap-1.5 text-xs text-neutral-700">
                              <span className="font-medium">{key}</span>
                              <input
                                type="number"
                                className="w-16 rounded border border-neutral-300 px-2 py-1 text-xs"
                                value={displayValue}
                                disabled={savingCode === `${policy.code}:${key}`}
                                data-testid={`policy-param-${policy.code}-${key}`}
                                onChange={(e) => {
                                  setParamDrafts((drafts) => ({
                                    ...drafts,
                                    [policy.code]: {
                                      ...(drafts[policy.code] ?? {}),
                                      [key]: e.target.value,
                                    },
                                  }));
                                }}
                                onBlur={(e) => {
                                  void handleParamBlur(policy, key, e.target.value);
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
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
