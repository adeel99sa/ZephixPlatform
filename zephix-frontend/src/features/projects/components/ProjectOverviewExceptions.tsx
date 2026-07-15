/**
 * OV-1 Phase C — open exceptions for THIS project via member-readable API.
 * GET /work/projects/:projectId/exceptions (workspace-member readable).
 * Seeing is not approving — no approve/reject on this surface.
 */

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

import { request } from '@/lib/api';

export type ProjectOverviewExceptionsProps = {
  projectId: string;
  workspaceId: string;
};

export type OverviewExceptionRow = {
  id: string;
  exceptionType: string;
  status: string;
  reason: string;
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
    .filter((row) => String(row.status || '').toUpperCase() === 'PENDING')
    .map((row) => {
      const codes = Array.isArray(row.policyCodes) ? row.policyCodes.filter(Boolean) : [];
      return {
        id: row.id,
        exceptionType: row.type ?? 'Exception',
        status: row.status ?? 'PENDING',
        reason: row.reason?.trim() || (codes.length ? codes.join(', ') : ''),
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
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-slate-100 px-3 py-2 text-xs dark:border-slate-700"
            data-testid={`overview-exception-${item.id}`}
          >
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {item.exceptionType.replace(/_/g, ' ')}
            </p>
            {item.reason && (
              <p className="mt-0.5 line-clamp-2 text-slate-500 dark:text-slate-400">{item.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
