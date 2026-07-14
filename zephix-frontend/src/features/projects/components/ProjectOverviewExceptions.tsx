/**
 * OV-1 Phase B — open exceptions for THIS project.
 *
 * Until GET /work/projects/:id/exceptions ships (member-readable):
 *   ADMIN  -> list from admin queue, filtered to this project
 *   MEMBER/VIEWER -> omit section (not a fake empty list)
 *
 * Swap: replace `fetchOpenExceptionsForProject` body with the member endpoint;
 * drop the admin-only early return when that lands.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { administrationApi, type GovernanceQueueItem } from '@/features/administration/api/administration.api';
import { useAuth } from '@/state/AuthContext';
import { isPlatformAdmin } from '@/utils/access';

export type ProjectOverviewExceptionsProps = {
  projectId: string;
  workspaceId: string;
};

export type OverviewExceptionRow = {
  id: string;
  exceptionType: string;
  reason: string;
};

function resolveItemProjectId(item: GovernanceQueueItem): string | null {
  if (item.projectId) return item.projectId;
  const metaPid = item.metadata?.projectId;
  return typeof metaPid === 'string' ? metaPid : null;
}

/**
 * Single data-source function — swap implementation to member endpoint later.
 * Returns null when the caller must omit the section (no readable source yet).
 */
export async function fetchOpenExceptionsForProject(args: {
  projectId: string;
  workspaceId: string;
  canReadAdminQueue: boolean;
}): Promise<OverviewExceptionRow[] | null> {
  // SWAP POINT (OV-BE member endpoint): return mapped GET /work/projects/:id/exceptions
  // and stop requiring canReadAdminQueue.
  if (!args.canReadAdminQueue) return null;

  const { data } = await administrationApi.listGovernanceQueue({
    workspaceId: args.workspaceId,
    status: 'PENDING',
    limit: 50,
  });
  return data
    .filter((row) => resolveItemProjectId(row) === args.projectId)
    .map((row) => ({
      id: row.id,
      exceptionType: row.exceptionType ?? 'Exception',
      reason: row.reason ?? '',
    }));
}

export function ProjectOverviewExceptions({
  projectId,
  workspaceId,
}: ProjectOverviewExceptionsProps) {
  const { user } = useAuth();
  const canReadAdminQueue = isPlatformAdmin(user);
  const [items, setItems] = useState<OverviewExceptionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    // No readable source for non-admin until member endpoint lands.
    if (!canReadAdminQueue) {
      setItems(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchOpenExceptionsForProject({
          projectId,
          workspaceId,
          canReadAdminQueue: true,
        });
        if (cancelled) return;
        setItems(rows);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError('Could not load open exceptions for this project.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canReadAdminQueue, workspaceId, projectId]);

  // null = no readable source for this role yet (omit section)
  if (!canReadAdminQueue) return null;
  if (items === null && !loading && !error) return null;

  if (loading && (items === null || items.length === 0) && !error) {
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

  if (!items || items.length === 0) {
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
        {canReadAdminQueue && (
          <Link
            to="/administration/governance?tab=exceptions"
            className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Governance queue
          </Link>
        )}
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
