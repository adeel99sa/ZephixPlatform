import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";

import { GovernanceExceptionsQueue } from "../components/GovernanceExceptionsQueue";
import { GovernancePoliciesTable } from "../components/GovernancePoliciesTable";

import {
  administrationApi,
  type GovernanceActivityEvent,
  type GovernancePolicySummary,
  type GovernanceQueueItem,
  type WorkspaceSnapshotRow,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
import {
  formatGovernanceActorLabel,
  isSelfApprovedFlag,
  SelfApprovedBadge,
} from "@/features/governance/selfApprovalDisplay";
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

function formatActivityTime(value: string | null | undefined): string {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MetricCard({
  label,
  value,
  title: tooltip,
  testId,
}: {
  label: string;
  value: string | number;
  title?: string;
  testId?: string;
}): JSX.Element {
  return (
    <div
      title={tooltip}
      className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
      data-testid={testId}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}

function PoliciesTabMetricsStrip({
  summary,
  summaryError,
  hasWorkspace,
}: {
  summary: GovernancePolicySummary | null;
  summaryError: string | null;
  hasWorkspace: boolean;
}): JSX.Element {
  let activeLabel: string = "—";
  if (!hasWorkspace) {
    activeLabel = "Select a workspace";
  } else if (summaryError) {
    activeLabel = "Error";
  } else if (summary) {
    activeLabel = `${summary.evaluableActiveCount} of ${summary.total} enforcing`;
  }

  const enforcingTooltip =
    summaryError ||
    "Enforcing = enabled AND evaluable (can actually run). Policies that are on but not evaluable stay in the catalog and do not count. Counts are for this workspace only.";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <MetricCard
        label="Active policies (this workspace)"
        value={activeLabel}
        title={enforcingTooltip}
        testId="governance-active-policies-metric"
      />
      {/* Hard blocks card omitted: staging health still returns a hardcoded 0 (not wired). */}
    </div>
  );
}

function GovernanceActivityWidget({
  workspaceId,
  events,
  loading,
  error,
}: {
  workspaceId: string | null;
  events: GovernanceActivityEvent[];
  loading: boolean;
  error: string | null;
}): JSX.Element {
  return (
    <section
      className="rounded-lg border border-neutral-200 bg-white shadow-sm"
      data-testid="governance-activity-widget"
    >
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-neutral-900">Recent activity</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Exception requests, approvals, and gate blocks for this workspace.
        </p>
      </div>
      <div className="p-4">
        {!workspaceId ? (
          <p className="text-sm text-neutral-600" data-testid="governance-activity-no-workspace">
            Select a workspace to load activity.
          </p>
        ) : loading ? (
          <p className="text-sm text-neutral-600" data-testid="governance-activity-loading">
            Loading activity…
          </p>
        ) : error ? (
          <p className="text-sm font-medium text-neutral-900" data-testid="governance-activity-error">
            {error}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-neutral-600" data-testid="governance-activity-empty">
            No recent governance activity for this workspace.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="governance-activity-list">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded border border-neutral-200 p-3 text-sm"
                data-testid={`governance-activity-row-${event.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-neutral-900">{event.eventType}</p>
                  {isSelfApprovedFlag(event.selfResolved) ? (
                    <SelfApprovedBadge testId={`governance-activity-self-${event.id}`} />
                  ) : null}
                </div>
                <p className="mt-1 text-neutral-700">{event.description}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatActivityTime(event.timestamp)} ·{" "}
                  {event.actorName || shortId(event.actorUserId) || "System"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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
            const resolverName = formatGovernanceActorLabel({
              id: item.resolvedByUserId,
              displayName: item.resolvedByDisplayName,
            });
            const adminLabel = resolverName ?? "—";
            const approved = item.status === "APPROVED" || item.status === "CONSUMED";
            const showSelfResolved = isSelfApprovedFlag(item.selfResolved);
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
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                      {getInitials(adminLabel)}
                    </div>
                    <span
                      className={cn(
                        "text-sm text-neutral-900",
                        item.resolvedByDisplayName ? undefined : "font-mono",
                      )}
                    >
                      {adminLabel}
                    </span>
                    {showSelfResolved ? (
                      <SelfApprovedBadge testId={`approvals-self-resolved-${item.id}`} />
                    ) : null}
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
                  {formatGovernanceActorLabel({
                    id: item.requestedByUserId,
                    displayName: item.requestedByDisplayName,
                  }) ?? "—"}{" "}
                  → “{policyTitleFromException(item)}”
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
  const shellWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [activeTab, setActiveTab] = useState<GovernanceTab>(() =>
    tabFromSearchParam(searchParams.get("tab")),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<GovernanceQueueItem[]>([]);
  const [pendingBadgeCount, setPendingBadgeCount] = useState(0);

  const [workspaces, setWorkspaces] = useState<WorkspaceSnapshotRow[]>([]);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  const [policySummary, setPolicySummary] = useState<GovernancePolicySummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [activity, setActivity] = useState<GovernanceActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Page-owned workspace picker (admin console does not set the shell store).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await administrationApi.listWorkspaces();
        if (!active) return;
        setWorkspaces(rows);
        setWorkspacesError(null);
        setSelectedWorkspaceId((prev) => {
          if (prev && rows.some((r) => r.workspaceId === prev)) return prev;
          if (shellWorkspaceId && rows.some((r) => r.workspaceId === shellWorkspaceId)) {
            return shellWorkspaceId;
          }
          return rows[0]?.workspaceId ?? null;
        });
      } catch {
        if (!active) return;
        setWorkspaces([]);
        setWorkspacesError("Failed to load workspaces.");
        setSelectedWorkspaceId(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [shellWorkspaceId]);

  const loadTabChrome = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queuePromise =
      activeTab === "approvals"
        ? administrationApi.listGovernanceQueue({ page: 1, limit: 200 })
        : administrationApi.listPendingDecisions({ page: 1, limit: 1 });

    const results = await Promise.allSettled([queuePromise]);

    if (results[0].status === "fulfilled") {
      if (activeTab === "approvals") {
        const approvalResult = results[0].value as { data: GovernanceQueueItem[] };
        setQueue(approvalResult.data);
      } else {
        setPendingBadgeCount(results[0].value.meta?.total ?? 0);
      }
    } else if (activeTab === "approvals") {
      setQueue([]);
      setError("Failed to load approval history.");
    } else {
      setPendingBadgeCount(0);
    }

    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    void loadTabChrome();
  }, [loadTabChrome]);

  useEffect(() => {
    const tab = tabFromSearchParam(searchParams.get("tab"));
    setActiveTab(tab);
  }, [searchParams]);

  // Summary + activity — workspace-scoped. Errors surface; empty is not an error.
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setPolicySummary(null);
      setSummaryError(null);
      setActivity([]);
      setActivityError(null);
      setActivityLoading(false);
      return;
    }

    let active = true;
    setActivityLoading(true);
    setSummaryError(null);
    setActivityError(null);

    (async () => {
      const [summaryResult, activityResult] = await Promise.allSettled([
        administrationApi.getGovernancePolicySummary(selectedWorkspaceId),
        administrationApi.listRecentActivity({
          workspaceId: selectedWorkspaceId,
          limit: 20,
        }),
      ]);

      if (!active) return;

      if (summaryResult.status === "fulfilled") {
        setPolicySummary(summaryResult.value);
        setSummaryError(null);
      } else {
        setPolicySummary(null);
        setSummaryError("Failed to load policy summary.");
      }

      if (activityResult.status === "fulfilled") {
        setActivity(activityResult.value);
        setActivityError(null);
      } else {
        setActivity([]);
        setActivityError("Failed to load recent activity.");
      }
      setActivityLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  const setGovernanceTab = (tab: GovernanceTab): void => {
    setActiveTab(tab);
    if (tab === "policies") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <label
                htmlFor="governance-workspace-select"
                className="block text-xs font-medium uppercase tracking-wide text-neutral-500"
              >
                Workspace
              </label>
              <select
                id="governance-workspace-select"
                data-testid="governance-workspace-select"
                className="mt-1 w-full max-w-md rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                value={selectedWorkspaceId ?? ""}
                disabled={workspaces.length === 0}
                onChange={(e) => {
                  setSelectedWorkspaceId(e.target.value || null);
                }}
              >
                {workspaces.length === 0 ? (
                  <option value="">No workspaces available</option>
                ) : (
                  workspaces.map((ws) => (
                    <option key={ws.workspaceId} value={ws.workspaceId}>
                      {ws.workspaceName}
                    </option>
                  ))
                )}
              </select>
              {workspacesError ? (
                <p className="mt-1 text-sm font-medium text-neutral-900" data-testid="governance-workspaces-error">
                  {workspacesError}
                </p>
              ) : null}
              {summaryError ? (
                <p className="mt-1 text-sm font-medium text-neutral-900" data-testid="governance-summary-error">
                  {summaryError}
                </p>
              ) : null}
            </div>
          </div>

          <PoliciesTabMetricsStrip
            summary={policySummary}
            summaryError={summaryError}
            hasWorkspace={Boolean(selectedWorkspaceId)}
          />
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Policies</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Workspace-scoped catalog for the selected workspace. Template configuration remains available under{" "}
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
          <GovernancePoliciesTable workspaceId={selectedWorkspaceId} />
          <GovernanceActivityWidget
            workspaceId={selectedWorkspaceId}
            events={activity}
            loading={activityLoading}
            error={activityError}
          />
        </section>
      ) : null}

      {activeTab === "exceptions" ? (
        <GovernanceExceptionsQueue
          workspaceId={selectedWorkspaceId}
          workspaces={workspaces}
          onWorkspaceChange={setSelectedWorkspaceId}
          onPendingCountChange={setPendingBadgeCount}
        />
      ) : null}

      {activeTab === "approvals" ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Approvals</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Resolved exception decisions across all workspaces (org-wide). Data comes from your governance exception
            records.
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
