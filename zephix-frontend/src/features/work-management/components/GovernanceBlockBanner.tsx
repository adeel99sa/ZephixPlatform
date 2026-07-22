import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { intentColors } from "@/design/tokens";
import { cn } from "@/lib/utils";
import {
  fetchOpenExceptionsForProject,
  requesterDisplayLabel,
  type OverviewExceptionRow,
} from "@/features/projects/components/ProjectOverviewExceptions";
import { emitGovernanceBlockChanged } from "@/features/work-management/governanceBlockRecord";

export type GovernanceBlockBannerProps = {
  projectId: string;
  workspaceId: string;
  className?: string;
};

function statusHref(projectId: string, row: OverviewExceptionRow): string {
  if (row.phaseId) {
    return `/work/projects/${projectId}/plan?phaseId=${encodeURIComponent(row.phaseId)}`;
  }
  return `/projects/${projectId}#overview-exceptions-strip`;
}

/**
 * Live block banner — status from GET /work/projects/:id/exceptions only.
 * Refetches on mount, window focus, and governance-block:changed.
 */
export function GovernanceBlockBanner({
  projectId,
  workspaceId,
  className,
}: GovernanceBlockBannerProps): JSX.Element | null {
  const [rows, setRows] = useState<OverviewExceptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId || !workspaceId) {
      setRows([]);
      return;
    }
    try {
      const open = await fetchOpenExceptionsForProject({ projectId, workspaceId });
      setRows(open);
      setError(null);
    } catch {
      setRows([]);
      setError("Could not load active blocks.");
    }
  }, [projectId, workspaceId]);

  useEffect(() => {
    void load();
    const onFocus = (): void => {
      void load();
    };
    const onChanged = (): void => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("governance-block:changed", onChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("governance-block:changed", onChanged);
    };
  }, [load]);

  if (error && rows.length === 0) {
    return (
      <p
        className={cn("text-xs text-neutral-600", className)}
        data-testid="governance-block-banner-error"
        role="status"
      >
        {error}
      </p>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div
      className={cn("space-y-2", className)}
      data-testid="governance-block-banner"
      role="region"
      aria-label="Active governance blocks"
    >
      {rows.map((row) => (
        <aside
          key={row.id}
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            intentColors.danger.border,
            intentColors.danger.bg,
            intentColors.danger.text,
          )}
          data-testid={`governance-block-card-${row.id}`}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                <span>Action blocked</span>
                <span
                  className="rounded border border-current/20 bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  data-testid={`governance-block-status-${row.id}`}
                >
                  {row.status === "CREATED" ? "PENDING" : row.status}
                </span>
              </div>
              {row.reason ? (
                <p data-testid={`governance-block-reason-${row.id}`}>
                  <span className="font-medium">Why:</span> {row.reason}
                </p>
              ) : null}
              <p data-testid={`governance-block-policy-${row.id}`}>
                <span className="font-medium">Policy:</span> {row.policyName}
              </p>
              <p data-testid={`governance-block-required-${row.id}`}>
                <span className="font-medium">Required to clear:</span> {row.requiredToClear}
              </p>
              <p data-testid={`governance-block-waiting-${row.id}`}>
                <span className="font-medium">Waiting on:</span> {row.waitingOn}
              </p>
              <p data-testid={`governance-block-requester-${row.id}`}>
                <span className="font-medium">Requested by:</span>{" "}
                {requesterDisplayLabel(row)}
              </p>
            </div>
            <Link
              to={statusHref(projectId, row)}
              className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              data-testid={`governance-block-view-status-${row.id}`}
              onClick={() => {
                emitGovernanceBlockChanged();
              }}
            >
              View status
            </Link>
          </div>
        </aside>
      ))}
    </div>
  );
}
