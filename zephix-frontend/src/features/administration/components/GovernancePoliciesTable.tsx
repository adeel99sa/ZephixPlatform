import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  administrationApi,
  type WorkspaceGovernancePolicy,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META, resolvePolicyArmedState } from "@/features/administration/constants/governance-policies";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";
import {
  formatPolicyParamChip,
  isNumericPolicyParamKey,
  NUMERIC_POLICY_PARAM_KEYS,
  severityChipClass,
  sourceIndicatorLabel,
  verdictBadgeClass,
  verdictDisplayLabel,
  type NumericPolicyParamKey,
} from "@/features/administration/utils/governance-policy-display";

export type GovernancePoliciesTableProps = {
  workspaceId: string | null;
};

/** Sentence contract is live when the API supplies server-owned `when.text`. */
export function hasPolicySentenceContract(policy: WorkspaceGovernancePolicy): boolean {
  return Boolean(policy.when?.text?.trim());
}

function policyDescription(policy: WorkspaceGovernancePolicy): string {
  return (
    policy.description?.trim() ||
    POLICY_UI_META[policy.code]?.description ||
    ""
  );
}

function policyName(policy: WorkspaceGovernancePolicy): string {
  return (
    policy.name?.trim() ||
    policy.humanLabel?.trim() ||
    POLICY_UI_META[policy.code]?.displayName ||
    policy.code
  );
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

function PolicySentenceCard({
  policy,
  saving,
  onToggle,
}: {
  policy: WorkspaceGovernancePolicy;
  saving: boolean;
  onToggle: () => void;
}): JSX.Element {
  const whenText = policy.when?.text?.trim() ?? "";
  const scopeLabel = policy.scope?.label?.trim() ?? "";
  const params = Array.isArray(policy.when?.params) ? policy.when.params : [];
  const showRelease = policy.verdict === "BLOCK" && policy.release != null;
  const notEvaluable = policy.isEvaluable === false;

  return (
    <article
      className={cn(
        "border-b border-neutral-100 px-4 py-4 last:border-b-0",
        notEvaluable && "bg-neutral-50/80",
      )}
      data-testid={`governance-policy-row-${policy.code}`}
      aria-labelledby={`policy-title-${policy.code}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h3
            id={`policy-title-${policy.code}`}
            className={cn(
              "text-sm font-medium",
              notEvaluable ? "text-neutral-500" : "text-neutral-900",
            )}
          >
            {policyName(policy)}
          </h3>

          {notEvaluable ? (
            <p
              className="text-sm text-neutral-500"
              data-testid={`policy-not-armed-${policy.code}`}
            >
              Not evaluable
              {policy.notEvaluableReason?.trim()
                ? ` — ${policy.notEvaluableReason.trim()}`
                : ""}
            </p>
          ) : null}

          <dl className={cn("grid gap-2 text-sm", notEvaluable && "opacity-70")}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                When
              </dt>
              <dd
                className="min-w-0 flex-1 text-neutral-800"
                data-testid={`policy-when-${policy.code}`}
              >
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span>{whenText}</span>
                  {params.map((param) => (
                    <span
                      key={param.key}
                      className="inline-flex items-center rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700"
                      data-testid={`policy-param-chip-${policy.code}-${param.key}`}
                    >
                      {formatPolicyParamChip(param)}
                    </span>
                  ))}
                </span>
              </dd>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Where
              </dt>
              <dd
                className="min-w-0 flex-1 text-neutral-800"
                data-testid={`policy-where-${policy.code}`}
              >
                {scopeLabel || "—"}
              </dd>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Then
              </dt>
              <dd data-testid={`policy-verdict-${policy.code}`}>
                {policy.verdict ? (
                  <span
                    className={cn(
                      "inline-flex rounded border px-2 py-0.5 text-xs font-medium",
                      verdictBadgeClass(policy.verdict),
                    )}
                  >
                    {verdictDisplayLabel(policy.verdict)}
                  </span>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </dd>
            </div>

            {showRelease ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Release
                </dt>
                <dd
                  className="min-w-0 flex-1 text-neutral-800"
                  data-testid={`policy-release-${policy.code}`}
                >
                  {policy.release!.label?.trim() ||
                    `${policy.release!.requiredRole} · ${policy.release!.approvalsRequired} approval${
                      policy.release!.approvalsRequired === 1 ? "" : "s"
                    }`}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="shrink-0 pt-0.5">
          <Switch
            checked={policy.isEnabled}
            disabled={saving}
            aria-label={`Toggle ${policyName(policy)}`}
            data-testid={`policy-toggle-${policy.code}`}
            onChange={onToggle}
          />
        </div>
      </div>
    </article>
  );
}

/**
 * Pre-WAVE1 catalog table. Used when the API has not yet shipped `when.text`
 * so the console does not render a wall of "Unavailable".
 */
function LegacyPoliciesTableBody({
  policies,
  savingCode,
  paramDrafts,
  setParamDrafts,
  onToggle,
  onParamBlur,
}: {
  policies: WorkspaceGovernancePolicy[];
  savingCode: string | null;
  paramDrafts: Record<string, Partial<Record<NumericPolicyParamKey, string>>>;
  setParamDrafts: React.Dispatch<
    React.SetStateAction<Record<string, Partial<Record<NumericPolicyParamKey, string>>>>
  >;
  onToggle: (policy: WorkspaceGovernancePolicy) => void;
  onParamBlur: (
    policy: WorkspaceGovernancePolicy,
    key: NumericPolicyParamKey,
    rawValue: string,
  ) => void;
}): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left" data-testid="governance-policies-table">
        <thead>
          <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-2">Policy</th>
            <th className="px-4 py-2">Enforcement</th>
            <th className="px-4 py-2">Severity</th>
            <th className="px-4 py-2">Source</th>
            <th className="px-4 py-2">Parameters</th>
            <th className="px-4 py-2 text-right">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => {
            const editableParams = NUMERIC_POLICY_PARAM_KEYS.filter(
              (key) =>
                isNumericPolicyParamKey(key) &&
                (policy.params?.[key] != null || policy.bundleDefaults?.[key] != null),
            );
            const armed = resolvePolicyArmedState(policy);
            const severityLabel =
              policy.verdict ?? policy.severityEffective ?? policy.outcome ?? "—";

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
                  {armed.isEvaluable ? (
                    <p
                      className="text-xs text-neutral-700"
                      data-testid={`policy-enforcement-${policy.code}`}
                    >
                      {armed.enforcementPoint
                        ? `Enforces: ${armed.enforcementPoint}`
                        : "Enforcing"}
                    </p>
                  ) : (
                    <p
                      className="text-xs font-medium text-neutral-800"
                      data-testid={`policy-not-armed-${policy.code}`}
                    >
                      Not yet armed — requires {armed.requiresEngine}
                      {policy.notEvaluableReason?.trim()
                        ? ` (${policy.notEvaluableReason.trim()})`
                        : ""}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded border px-2 py-0.5 text-xs font-medium uppercase",
                      severityChipClass(String(severityLabel)),
                    )}
                    data-testid={`policy-severity-${policy.code}`}
                  >
                    {severityLabel}
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
                        const resolved = numericParamValue(
                          policy.params,
                          policy.bundleDefaults,
                          key,
                        );
                        const displayValue =
                          draft !== undefined ? draft : resolved === "" ? "" : String(resolved);
                        return (
                          <label
                            key={key}
                            className="flex items-center gap-1.5 text-xs text-neutral-700"
                          >
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
                                onParamBlur(policy, key, e.target.value);
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
                        onToggle(policy);
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
  );
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

  const useSentenceView = useMemo(
    () =>
      policies.length > 0 && policies.every((p) => hasPolicySentenceContract(p)),
    [policies],
  );

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
        row.code === policy.code
          ? { ...row, params: nextParams, source: "workspace" as const }
          : row,
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
          {useSentenceView
            ? "Each policy as a sentence: when it applies, where, the verdict, and how a block is released. Toggle only enables or disables enforcement."
            : "Nine governance policies for this workspace. Toggle enforcement and adjust numeric thresholds."}
        </p>
      </div>

      {useSentenceView ? (
        <div
          data-testid="governance-policies-table"
          data-view="sentence"
          role="list"
          aria-label="Workspace governance policies"
        >
          {policies.map((policy) => (
            <div key={policy.code} role="listitem">
              <PolicySentenceCard
                policy={policy}
                saving={savingCode === policy.code}
                onToggle={() => {
                  void handleToggle(policy);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div data-view="legacy">
          <LegacyPoliciesTableBody
            policies={policies}
            savingCode={savingCode}
            paramDrafts={paramDrafts}
            setParamDrafts={setParamDrafts}
            onToggle={(p) => {
              void handleToggle(p);
            }}
            onParamBlur={(p, key, raw) => {
              void handleParamBlur(p, key, raw);
            }}
          />
        </div>
      )}

      {policies.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-600" data-testid="governance-policies-empty">
          No policies returned for this workspace.
        </p>
      ) : null}
    </section>
  );
}
