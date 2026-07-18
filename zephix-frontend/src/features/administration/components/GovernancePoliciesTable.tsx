import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  administrationApi,
  type WorkspaceGovernancePolicy,
} from "@/features/administration/api/administration.api";
import { Switch } from "@/components/ui/form/Switch";
import { cn } from "@/lib/utils";
import {
  formatPolicyParamChip,
  verdictBadgeClass,
  verdictDisplayLabel,
} from "@/features/administration/utils/governance-policy-display";

export type GovernancePoliciesTableProps = {
  workspaceId: string | null;
};

function policyName(policy: WorkspaceGovernancePolicy): string {
  return policy.name?.trim() || policy.humanLabel?.trim() || policy.code;
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

          <dl
            className={cn(
              "grid gap-2 text-sm",
              notEvaluable && "opacity-70",
            )}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                When
              </dt>
              <dd
                className="min-w-0 flex-1 text-neutral-800"
                data-testid={`policy-when-${policy.code}`}
              >
                {whenText ? (
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
                ) : (
                  <span className="text-neutral-400">Unavailable</span>
                )}
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
                {scopeLabel || <span className="text-neutral-400">Unavailable</span>}
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
          Each policy as a sentence: when it applies, where, the verdict, and how a block is released.
          Toggle only enables or disables enforcement.
        </p>
      </div>

      <div data-testid="governance-policies-table" role="list" aria-label="Workspace governance policies">
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

      {policies.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-600" data-testid="governance-policies-empty">
          No policies returned for this workspace.
        </p>
      ) : null}
    </section>
  );
}
