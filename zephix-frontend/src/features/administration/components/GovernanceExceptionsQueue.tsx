import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/features/administration/components/ConfirmActionDialog";
import {
  administrationApi,
  type GovernanceDecision,
  type GovernanceQueueItem,
} from "@/features/administration/api/administration.api";
import { POLICY_UI_META } from "@/features/administration/constants/governance-policies";
import {
  formatPendingAgeFromHours,
  isPendingAgeStale,
} from "@/features/administration/utils/governance-policy-display";
import { cn } from "@/lib/utils";

export type ExceptionQueueStatus = "PENDING" | "APPROVED" | "CONSUMED" | "REJECTED";

const STATUS_TABS: { key: ExceptionQueueStatus; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "CONSUMED", label: "Consumed" },
  { key: "REJECTED", label: "Rejected" },
];

function policyCodeFromException(item: GovernanceQueueItem): string {
  const meta = item.metadata;
  if (meta && Array.isArray(meta.policyCodes) && meta.policyCodes.length) {
    return String(meta.policyCodes[0]);
  }
  if (meta && typeof meta.policyCode === "string") return meta.policyCode;
  return item.exceptionType;
}

function policyLabelFromCode(code: string): string {
  return POLICY_UI_META[code]?.displayName ?? code.replace(/_/g, " ");
}

function taskTitleFromException(item: GovernanceQueueItem): string | null {
  const meta = item.metadata;
  if (meta && typeof meta.taskTitle === "string" && meta.taskTitle.trim()) {
    return meta.taskTitle;
  }
  return null;
}

/** Maps pending decisions API rows into queue row shape (ageHours preserved). */
export function mapPendingDecisionToQueueItem(decision: GovernanceDecision): GovernanceQueueItem {
  return {
    id: decision.id,
    exceptionType: decision.type,
    workspaceId: decision.workspaceId,
    workspaceName: decision.workspaceName,
    projectId: decision.projectId,
    projectName: decision.projectName,
    reason: decision.reason,
    requestedAt: decision.requestedAt,
    requestedByUserId: decision.requestedByUserId,
    requestedByName: decision.requestedByName ?? null,
    status: "PENDING",
    ageHours: decision.ageHours,
    metadata: null,
  };
}

function requesterLabel(item: GovernanceQueueItem): string | null {
  const name = item.requestedByName?.trim();
  if (name) return name;
  const id = item.requestedByUserId?.trim();
  return id || null;
}

function ExceptionQueueRow({
  item,
  showActions,
  showPendingAge,
  disabled,
  onApprove,
  onReject,
}: {
  item: GovernanceQueueItem;
  showActions: boolean;
  showPendingAge: boolean;
  disabled: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}): JSX.Element {
  const policyCode = policyCodeFromException(item);
  const taskTitle = taskTitleFromException(item);
  const requestedAt = item.requestedAt || item.createdAt || "";
  const pendingAgeLabel = formatPendingAgeFromHours(item.ageHours);
  const stalePending = showPendingAge && isPendingAgeStale(item.ageHours);
  const requester = requesterLabel(item);

  return (
    <div
      className={cn(
        "rounded-lg border bg-neutral-50 p-4",
        stalePending ? "border-amber-300 bg-amber-50/60" : "border-neutral-200",
      )}
      data-testid={`governance-exception-row-${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
            <span className="text-sm font-semibold text-neutral-900">
              {taskTitle ?? "Governance exception"}
            </span>
          </div>
          <p className="mt-1 text-xs font-mono text-neutral-600" data-testid="exception-policy-code">
            {policyCode}
          </p>
          <p className="mt-0.5 text-sm text-neutral-700">{policyLabelFromCode(policyCode)}</p>
          {item.projectName ? (
            <p className="mt-2 text-sm text-neutral-600">{item.projectName}</p>
          ) : null}
          {requester ? (
            <p
              className="mt-2 text-xs text-neutral-600"
              data-testid={`exception-requester-${item.id}`}
            >
              Requested by <span className="font-medium text-neutral-800">{requester}</span>
            </p>
          ) : null}
          {item.reason ? (
            <p className="mt-2 text-sm italic text-neutral-600">“{item.reason}”</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <span className="text-xs text-neutral-500" data-testid="exception-requested-at">
            {requestedAt
              ? new Date(requestedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "—"}
          </span>
          {showPendingAge ? (
            <p
              className={cn(
                "mt-0.5 text-[10px] font-medium",
                stalePending ? "text-amber-800" : "text-neutral-500",
              )}
              data-testid="exception-pending-age"
            >
              {pendingAgeLabel}
            </p>
          ) : null}
        </div>
      </div>

      {showActions ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReject(item.id)}
            className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 hover:bg-neutral-100 disabled:opacity-60"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onApprove(item.id)}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            data-testid="exception-approve-btn"
          >
            Approve
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type GovernanceExceptionsQueueProps = {
  /** When set with scope=workspace, filters the queue to this workspace (API-honoured). */
  workspaceId?: string | null;
  workspaces?: Array<{ workspaceId: string; workspaceName: string }>;
  onWorkspaceChange?: (workspaceId: string | null) => void;
  onPendingCountChange?: (count: number) => void;
};

/**
 * PENDING uses listPendingDecisions (keeps ageHours + decision fields).
 * Backend HONESTY-1 (#462) accepts workspaceId on that endpoint — scope toggle is safe.
 */
export function GovernanceExceptionsQueue({
  workspaceId = null,
  workspaces = [],
  onWorkspaceChange,
  onPendingCountChange,
}: GovernanceExceptionsQueueProps): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<ExceptionQueueStatus>("PENDING");
  const [scope, setScope] = useState<"workspace" | "org">("workspace");
  const [rows, setRows] = useState<GovernanceQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const effectiveWorkspaceId =
    scope === "workspace" && workspaceId ? workspaceId : undefined;

  const refreshPendingCount = useCallback(async () => {
    try {
      const { meta } = await administrationApi.listPendingDecisions({
        page: 1,
        limit: 1,
        workspaceId: effectiveWorkspaceId,
      });
      onPendingCountChange?.(meta?.total ?? 0);
    } catch {
      onPendingCountChange?.(0);
    }
  }, [onPendingCountChange, effectiveWorkspaceId]);

  const loadRows = useCallback(async () => {
    if (scope === "workspace" && !workspaceId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (statusFilter === "PENDING") {
        const { data } = await administrationApi.listPendingDecisions({
          page: 1,
          limit: 100,
          workspaceId: effectiveWorkspaceId,
        });
        setRows(data.map(mapPendingDecisionToQueueItem));
      } else {
        const { data } = await administrationApi.listGovernanceQueue({
          status: statusFilter,
          page: 1,
          limit: 100,
          workspaceId: effectiveWorkspaceId,
        });
        setRows(data);
      }
    } catch {
      setRows([]);
      setError("Failed to load exceptions.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, effectiveWorkspaceId, scope, workspaceId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount, rows]);

  const handleApproveConfirm = async (resolutionNote: string): Promise<void> => {
    if (!approveTargetId) return;
    const id = approveTargetId;
    setActioningId(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await administrationApi.approveException(id, resolutionNote || null);
      toast.success("Exception approved.");
      await loadRows();
      await refreshPendingCount();
    } catch {
      toast.error("Could not approve exception.");
      await loadRows();
      await refreshPendingCount();
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectConfirm = async (reason: string): Promise<void> => {
    if (!rejectTargetId) return;
    const id = rejectTargetId;
    setActioningId(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await administrationApi.rejectException(id, reason);
      toast.success("Exception rejected.");
      await loadRows();
      await refreshPendingCount();
    } catch {
      toast.error("Could not reject exception.");
      await loadRows();
      await refreshPendingCount();
    } finally {
      setActioningId(null);
    }
  };

  const scopeLabel =
    scope === "org"
      ? "all workspaces"
      : workspaceId
        ? "this workspace"
        : "select a workspace";

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Exceptions queue</h2>
          <p className="mt-1 text-xs text-neutral-600" data-testid="exceptions-scope-label">
            Showing exceptions for {scopeLabel}.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Exception scope"
            data-testid="exception-scope-toggle"
          >
            <button
              type="button"
              aria-pressed={scope === "workspace"}
              onClick={() => setScope("workspace")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                scope === "workspace"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100",
              )}
              data-testid="exception-scope-workspace"
            >
              This workspace
            </button>
            <button
              type="button"
              aria-pressed={scope === "org"}
              onClick={() => setScope("org")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                scope === "org"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100",
              )}
              data-testid="exception-scope-org"
            >
              All workspaces
            </button>
          </div>
          {scope === "workspace" && workspaces.length > 0 ? (
            <label className="block text-xs text-neutral-600">
              <span className="sr-only">Workspace filter</span>
              <select
                className="mt-0.5 w-full min-w-[200px] rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900"
                value={workspaceId ?? ""}
                data-testid="exception-workspace-select"
                onChange={(e) => {
                  onWorkspaceChange?.(e.target.value || null);
                }}
              >
                {workspaces.map((ws) => (
                  <option key={ws.workspaceId} value={ws.workspaceId}>
                    {ws.workspaceName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div
            className="flex flex-wrap gap-1"
            role="tablist"
            aria-label="Exception status"
            data-testid="exception-status-tabs"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === tab.key
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100",
                )}
                data-testid={`exception-status-tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {scope === "workspace" && !workspaceId ? (
        <p className="mt-4 text-sm text-neutral-600" data-testid="exceptions-need-workspace">
          Select a workspace to load exceptions for this workspace, or widen to all workspaces.
        </p>
      ) : null}

      {error ? <p className="mt-2 text-sm font-medium text-neutral-900">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-neutral-600">Loading exceptions…</p>
      ) : rows.length === 0 && !(scope === "workspace" && !workspaceId) ? (
        <div className="py-16 text-center" data-testid="exceptions-empty-state">
          <ShieldCheck className="mx-auto h-12 w-12 text-neutral-300" aria-hidden />
          <h3 className="mt-4 text-sm font-medium text-neutral-900">All clear</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
            {statusFilter === "PENDING"
              ? `No pending exception requests for ${scopeLabel}. When a team member is blocked by a governance policy, their exception request will appear here.`
              : `No ${statusFilter.toLowerCase()} exceptions for ${scopeLabel}.`}
          </p>
        </div>
      ) : rows.length > 0 ? (
        <div className="mt-4 space-y-3" data-testid="exceptions-queue-list">
          {rows.map((item) => (
            <ExceptionQueueRow
              key={item.id}
              item={item}
              showActions={statusFilter === "PENDING"}
              showPendingAge={statusFilter === "PENDING"}
              disabled={actioningId === item.id}
              onApprove={setApproveTargetId}
              onReject={setRejectTargetId}
            />
          ))}
        </div>
      ) : null}

      <ConfirmActionDialog
        isOpen={!!approveTargetId}
        onClose={() => setApproveTargetId(null)}
        title="Approve exception"
        description="The requester may proceed once approved. Add an optional note for the audit trail."
        inputLabel="Resolution note"
        inputPlaceholder="Optional approval note"
        inputRequired={false}
        confirmLabel="Approve"
        onConfirm={handleApproveConfirm}
      />
      <ConfirmActionDialog
        isOpen={!!rejectTargetId}
        onClose={() => setRejectTargetId(null)}
        title="Reject exception"
        inputLabel="Reason for rejection"
        inputRequired
        confirmLabel="Reject"
        confirmVariant="destructive"
        onConfirm={handleRejectConfirm}
      />
    </section>
  );
}
