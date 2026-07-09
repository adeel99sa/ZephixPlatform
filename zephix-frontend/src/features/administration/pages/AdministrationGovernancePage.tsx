import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";

import { GovernanceExceptionsQueue } from "../components/GovernanceExceptionsQueue";
import { GovernancePoliciesTable } from "../components/GovernancePoliciesTable";

import {
  administrationApi,
  type GovernanceCatalogItem,
  type GovernanceHealth,
  type GovernanceQueueItem,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
import { useWorkspaceStore } from "@/state/workspace.store";
import { cn } from "@/lib/utils";

type GovernanceTab = "policies" | "exceptions" | "approvals";

function tabFromSearchParam(raw: string | null): GovernanceTab {
  if (raw === "exceptions" || raw === "approvals" || raw === "policies") return raw;
  return "policies";
}

function shortId(id: string | undefined | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  if (parts.length === 1 && parts[0]!.length >= 2) return parts[0]!.slice(0, 2).toUpperCase();
  return label.slice(0, 2).toUpperCase() || "—";
}

function policyTitleFromException(item: GovernanceQueueItem): string {
  const meta = item.metadata;
  if (meta && Array.isArray(meta.policyCodes) && meta.policyCodes.length) {
    return (meta.policyCodes as string[])
      .map((c) => POLICY_UI_META[c]?.displayName ?? c)
      .join(", ");
  }
  if (meta && typeof meta.policyCode === "string") {
    return POLICY_UI_META[meta.policyCode]?.displayName ?? meta.policyCode;
  }
  return item.exceptionType.replace(/_/g, " ");
}

function MetricCard({
  label,
  value,
  title: tooltip,
}: {
  label: string;
  value: number;
  title?: string;
}): JSX.Element {
  return (
    <div
      title={tooltip}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}

function GovernanceHealthStrip({
  health,
  activePolicyTemplatesCount,
}: {
  health: GovernanceHealth | null;
  activePolicyTemplatesCount: number;
}): JSX.Element {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Active policies"
        value={activePolicyTemplatesCount}
        title="Count of catalog policies enabled on at least one template."
      />
      <MetricCard
        label="Capacity warnings"
        value={health?.capacityWarnings ?? 0}
        title="Pending capacity-related exception requests in the queue."
      />
      <MetricCard
        label="Budget warnings"
        value={health?.budgetWarnings ?? 0}
        title="Pending budget-related exception requests in the queue."
      />
      <MetricCard
        label="Hard blocks (this week)"
        value={health?.hardBlocksThisWeek ?? 0}
        title="Reserved for future hard-block metrics; health API may return 0 until wired."
      />
    </div>
  );
}

function ApprovalsTable({ rows }: { rows: GovernanceQueueItem[] }): JSX.Element {
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ta = new Date(a.updatedAt ?? a.requestedAt).getTime();
      const tb = new Date(b.updatedAt ?? b.requestedAt).getTime();
      return tb - ta;
    });
  }, [rows]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-4">Timestamp</th>
            <th className="py-2 pr-4">Admin</th>
            <th className="py-2 pr-4">Outcome</th>
            <th className="py-2">Context</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const decided = item.updatedAt ?? item.requestedAt;
            const adminLabel = item.resolvedByUserId ? shortId(item.resolvedByUserId) : "—";
            const approved = item.status === "APPROVED";
            return (
              <tr key={item.id} className="border-b border-neutral-100">
                <td className="py-3 align-top text-sm text-neutral-600">
                  {decided
                    ? new Date(decided).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="py-3 align-top">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                      {getInitials(adminLabel)}
                    </div>
                    <span className="text-sm text-neutral-900">{adminLabel}</span>
                  </div>
                </td>
                <td className="py-3 align-top">
                  <span
                    className={cn(
                      "inline-flex rounded border px-2 py-0.5 text-xs font-medium",
                      approved
                        ? "border-neutral-300 bg-white text-neutral-900"
                        : "border-neutral-300 bg-neutral-100 text-neutral-800",
                    )}
                  >
                    {approved ? "Approved" : "Rejected"}
                  </span>
                </td>
                <td className="py-3 align-top text-sm text-neutral-700">
                  {shortId(item.requestedByUserId)} → “{policyTitleFromException(item)}”
                  {item.projectName ? ` on ${item.projectName}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdministrationGovernancePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [activeTab, setActiveTab] = useState<GovernanceTab>(() =>
    tabFromSearchParam(searchParams.get("tab")),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<GovernanceHealth | null>(null);
  const [queue, setQueue] = useState<GovernanceQueueItem[]>([]);
  const [catalog, setCatalog] = useState<GovernanceCatalogItem[]>([]);
  const [pendingBadgeCount, setPendingBadgeCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queuePromise =
      activeTab === "approvals"
        ? administrationApi.listGovernanceQueue({ page: 1, limit: 200 })
        : administrationApi.listPendingDecisions({ page: 1, limit: 1 });

    const results = await Promise.allSettled([
      administrationApi.getGovernanceHealth(),
      queuePromise,
      administrationApi.getGovernanceCatalog(),
    ]);

    if (results[0].status === "fulfilled") {
      setHealth(results[0].value);
    } else {
      setHealth(null);
    }

    if (results[1].status === "fulfilled") {
      if (activeTab === "approvals") {
        const approvalResult = results[1].value as { data: GovernanceQueueItem[] };
        setQueue(approvalResult.data);
      } else {
        setPendingBadgeCount(results[1].value.meta?.total ?? 0);
      }
    } else if (activeTab === "approvals") {
      setQueue([]);
    } else {
      setPendingBadgeCount(0);
    }

    if (results[2].status === "fulfilled") {
      setCatalog(results[2].value);
    } else {
      setCatalog([]);
    }

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length === results.length) {
      setError("Failed to load governance data.");
    } else if (failed.length > 0 && results[1].status === "rejected" && activeTab === "approvals") {
      setError("Failed to load approval history.");
    } else {
      setError(null);
    }

    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = tabFromSearchParam(searchParams.get("tab"));
    setActiveTab(tab);
  }, [searchParams]);

  const setGovernanceTab = (tab: GovernanceTab): void => {
    setActiveTab(tab);
    if (tab === "policies") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const activePolicyTemplatesCount = useMemo(
    () => catalog.filter((c) => c.activeOnTemplates > 0).length,
    [catalog],
  );

  const resolvedDecisions = useMemo(
    () => queue.filter((q) => q.status === "APPROVED" || q.status === "REJECTED"),
    [queue],
  );

  const goTemplates = (): void => {
    navigate("/administration/templates");
  };

  return (
    <div className="space-y-6 text-neutral-900">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Governance</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage policy definitions, exception workflow, and approval readiness.
        </p>
      </header>

      <GovernanceHealthStrip health={health} activePolicyTemplatesCount={activePolicyTemplatesCount} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "policies" as const, label: "Policies", badge: null as number | null },
            { key: "exceptions" as const, label: "Exceptions", badge: pendingBadgeCount },
            { key: "approvals" as const, label: "Approvals", badge: null },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setGovernanceTab(tab.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-xs font-bold text-white">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "policies" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Policies</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Workspace-level governance policies. Template configuration remains available under{" "}
              <button
                type="button"
                onClick={goTemplates}
                className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Templates
              </button>
              .
            </p>
          </div>
          <GovernancePoliciesTable workspaceId={activeWorkspaceId} />
        </section>
      ) : null}

      {activeTab === "exceptions" ? (
        <GovernanceExceptionsQueue onPendingCountChange={setPendingBadgeCount} />
      ) : null}

      {activeTab === "approvals" ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Approvals</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Resolved exception decisions (approved or rejected). Data comes from your governance exception records.
          </p>
          {error ? <p className="mt-2 text-sm font-medium text-neutral-900">{error}</p> : null}
          {loading ? (
            <p className="mt-2 text-sm text-neutral-600">Loading decisions…</p>
          ) : resolvedDecisions.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-neutral-300" aria-hidden />
              <h3 className="mt-4 text-sm font-medium text-neutral-900">No decisions yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
                Approved and rejected governance exceptions will be recorded here as your organization&apos;s governance
                decision log.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <ApprovalsTable rows={resolvedDecisions} />
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
