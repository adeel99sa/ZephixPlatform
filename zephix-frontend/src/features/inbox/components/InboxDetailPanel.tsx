import { useEffect, useState } from "react";
import { EmptyState } from "@/ui/components/EmptyState";
import { ErrorState } from "@/ui/components/ErrorState";
import { LoadingState } from "@/ui/components/LoadingState";
import type { InboxAction, InboxItem } from "../types";
import { InboxActionBar } from "./InboxActionBar";
import { InboxSeverityBadge } from "./InboxSeverityBadge";
import { InboxTypeBadge } from "./InboxTypeBadge";
import { getProjectApprovalReadiness } from "@/features/projects/governance.api";

type InboxDetailPanelProps = {
  item: InboxItem | null;
  loading: boolean;
  error: string | null;
  actionError: string | null;
  canMutate: boolean;
  pendingAction: InboxAction | null;
  onMarkRead: () => void;
  onLater: () => void;
  onClear: () => void;
  onOpenSource: () => void;
  onRetry: () => void;
};

export function InboxDetailPanel({
  item,
  loading,
  error,
  actionError,
  canMutate,
  pendingAction,
  onMarkRead,
  onLater,
  onClear,
  onOpenSource,
  onRetry,
}: InboxDetailPanelProps) {
  const [readinessSummary, setReadinessSummary] = useState<{
    total: number;
    notReady: number;
    blockers: string[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!item || item.type !== "approval_request" || !item.sourceProjectId) {
      setReadinessSummary(null);
      return () => {
        active = false;
      };
    }
    (async () => {
      try {
        const data = await getProjectApprovalReadiness(item.sourceProjectId as string);
        if (!active) return;
        const list = data.items || [];
        const notReadyList = list.filter((entry) => entry.status === "not_ready");
        const blockers = Array.from(
          new Set(notReadyList.flatMap((entry) => entry.blockingReasons || [])),
        ).slice(0, 3);
        setReadinessSummary({
          total: list.length,
          notReady: notReadyList.length,
          blockers,
        });
      } catch {
        if (active) {
          setReadinessSummary(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [item]);

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4">
      {loading ? (
        <LoadingState message="Loading item details..." className="min-h-[240px]" />
      ) : error ? (
        <ErrorState
          title="Detail unavailable"
          description={error}
          onRetry={onRetry}
          className="min-h-[240px]"
        />
      ) : !item ? (
        <EmptyState
          title="Select an inbox item"
          description="Choose an event from the stream to open details and take action."
        />
      ) : (
        <div className="space-y-4">
          <header className="space-y-2 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <InboxTypeBadge type={item.type} />
              <InboxSeverityBadge severity={item.severity} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="text-xs text-slate-500">{new Date(item.time).toLocaleString()}</p>
          </header>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event summary
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              {item.summary || "No additional summary available."}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source context
            </h3>
            <div className="mt-1 space-y-1 text-sm text-slate-700">
              <p>Surface: {item.sourceSurface}</p>
              <p>Project: {item.sourceProjectName || "N/A"}</p>
              <p>Workspace: {item.sourceWorkspaceId || "N/A"}</p>
              <p>Status: {item.status}</p>
            </div>
          </section>

          {item.type === "approval_request" ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Approval readiness
              </h3>
              {readinessSummary ? (
                <div className="mt-1 space-y-1 text-sm text-slate-700">
                  <p>
                    Readiness status:{" "}
                    {readinessSummary.notReady > 0 ? (
                      <span className="zs-badge-blocked">
                        {readinessSummary.notReady} not ready
                      </span>
                    ) : (
                      <span className="zs-badge-ready">Ready</span>
                    )}
                  </p>
                  <p>Approval records: {readinessSummary.total}</p>
                  {readinessSummary.blockers.length > 0 ? (
                    <ul className="list-disc pl-4 text-xs text-slate-600">
                      {readinessSummary.blockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  Readiness summary is not available for this item.
                </p>
              )}
            </section>
          ) : null}

          {actionError ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {actionError}
            </p>
          ) : null}

          <InboxActionBar
            canMutate={canMutate}
            availableActions={item.availableActions}
            pendingAction={pendingAction}
            onMarkRead={onMarkRead}
            onLater={onLater}
            onClear={onClear}
            onOpenSource={onOpenSource}
          />
        </div>
      )}
    </aside>
  );
}

