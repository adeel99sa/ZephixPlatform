/**
 * OV-1 Phase C / GOV-BUILD WAVE1 Unit 3 — open exceptions for THIS project.
 * GET /work/projects/:projectId/exceptions (workspace-member readable).
 * Seeing is not approving — no approve/reject on this surface.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { request } from '@/lib/api';
import { policyDisplayName } from '@/features/work-management/governanceBlockRecord';
import { intentColors } from '@/design/tokens';
import { cn } from '@/lib/utils';

export type ProjectOverviewExceptionsProps = {
  projectId: string;
  workspaceId: string;
};

export type OverviewExceptionRow = {
  id: string;
  exceptionType: string;
  status: string;
  reason: string;
  policyName: string;
  policyCodes: string[];
  requestedBy: string | null;
  phaseId: string | null;
  taskId: string | null;
  requiredToClear: string;
  waitingOn: string;
};

/** Member API row shape (OV-BE-1 ProjectExceptionView). */
type ProjectExceptionApiRow = {
  id: string;
  type?: string;
  status?: string;
  requestedBy?: string;
  requestedAt?: string;
  policyCodes?: string[];
  phaseId?: string | null;
  taskId?: string | null;
  reason?: string;
};

function shortRequester(id: string | null | undefined): string {
  if (!id) return 'Unknown requester';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

/**
 * Single data-source — project-scoped member endpoint only (not admin org queue).
 */
export async function fetchOpenExceptionsForProject(args: {
  projectId: string;
  workspaceId: string;
}): Promise<OverviewExceptionRow[]> {
  const payload = await request.get<
    ProjectExceptionApiRow[] | { data?: ProjectExceptionApiRow[] }
  >(`/work/projects/${args.projectId}/exceptions`, {
    headers: { 'x-workspace-id': args.workspaceId },
  });
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  return rows
    .filter((row) => {
      const s = String(row.status || '').toUpperCase();
      return s === 'PENDING' || s === 'CREATED';
    })
    .map((row) => {
      const codes = Array.isArray(row.policyCodes) ? row.policyCodes.filter(Boolean) : [];
      const status = String(row.status ?? 'PENDING').toUpperCase();
      const hasGate = Boolean(row.phaseId) || codes.some((c) => /gate|PHASE_GATE/i.test(c));
      return {
        id: row.id,
        exceptionType: row.type ?? 'Exception',
        status,
        reason: row.reason?.trim() || (codes.length ? codes.map(policyDisplayName).join(', ') : ''),
        policyName: codes.length
          ? codes.map(policyDisplayName).join(', ')
          : (row.type ?? 'Governance policy').replace(/_/g, ' '),
        policyCodes: codes,
        requestedBy: row.requestedBy?.trim() || null,
        phaseId: row.phaseId ?? null,
        taskId: row.taskId ?? null,
        requiredToClear: hasGate
          ? 'Complete the phase-gate evidence checklist and obtain organization admin approval.'
          : 'Organization admin must approve this exception before the blocked action can proceed.',
        waitingOn: 'Organization admin',
      };
    });
}

export function ProjectOverviewExceptions({
  projectId,
  workspaceId,
}: ProjectOverviewExceptionsProps) {
  const [items, setItems] = useState<OverviewExceptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workspaceId || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchOpenExceptionsForProject({ projectId, workspaceId });
        if (cancelled) return;
        setItems(rows);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setItems([]);
          setLoaded(true);
          setError('Could not load open exceptions for this project.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, projectId]);

  if (loading && !loaded && !error) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800"
        data-testid="overview-exceptions-loading"
      >
        Loading open exceptions…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
        data-testid="overview-exceptions-error"
      >
        {error}
      </div>
    );
  }

  if (!loaded) return null;

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400"
        data-testid="overview-exceptions-empty"
      >
        No open exceptions for this project.
      </div>
    );
  }

  return (
    <section
      id="overview-exceptions-strip"
      className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      data-testid="overview-exceptions-strip"
      aria-label="Open exceptions for this project"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Open exceptions
          </h2>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {items.length}
          </span>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const statusHref = item.phaseId
            ? `/work/projects/${projectId}/plan?phaseId=${encodeURIComponent(item.phaseId)}`
            : undefined;
          return (
            <li
              key={item.id}
              className={cn(
                'rounded-md border px-3 py-2 text-xs',
                intentColors.warning.border,
                intentColors.warning.bg,
              )}
              data-testid={`overview-exception-${item.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {item.policyName}
                  </p>
                  <p className="text-slate-700">
                    <span className="font-medium">Status:</span>{' '}
                    <span data-testid={`overview-exception-status-${item.id}`}>{item.status}</span>
                  </p>
                  {item.reason ? (
                    <p className="text-slate-600" data-testid={`overview-exception-reason-${item.id}`}>
                      <span className="font-medium">Reason:</span> {item.reason}
                    </p>
                  ) : null}
                  <p data-testid={`overview-exception-requester-${item.id}`}>
                    <span className="font-medium">Requested by:</span>{' '}
                    {shortRequester(item.requestedBy)}
                  </p>
                  <p>
                    <span className="font-medium">Required to clear:</span> {item.requiredToClear}
                  </p>
                  <p>
                    <span className="font-medium">Waiting on:</span> {item.waitingOn}
                  </p>
                </div>
                {statusHref ? (
                  <Link
                    to={statusHref}
                    className="shrink-0 text-xs font-medium text-indigo-700 underline hover:text-indigo-900"
                    data-testid={`overview-exception-view-${item.id}`}
                  >
                    View gate
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
