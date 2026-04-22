import React, { useEffect, useRef, useState } from 'react';
import type { Sprint } from '@/features/sprints/sprints.api';

export interface SprintCellProps {
  taskId: string;
  iterationId: string | null;
  sprintMap: Map<string, Sprint>;
  activeSprints: Sprint[];
  planningSprints: Sprint[];
  /** When false, show label/chip only (no dropdown). */
  canEdit: boolean;
  onReassign: (taskId: string, nextIterationId: string | null) => Promise<void>;
}

function chipClasses(status: Sprint['status'] | 'unknown'): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200';
    case 'PLANNING':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'CANCELLED':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

export const SprintCell: React.FC<SprintCellProps> = ({
  taskId,
  iterationId,
  sprintMap,
  activeSprints,
  planningSprints,
  canEdit,
  onReassign,
}) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = iterationId ? sprintMap.get(iterationId) : undefined;
  const displayName = current?.name ?? (iterationId ? 'Sprint (unknown)' : null);
  const statusForChip: Sprint['status'] | 'unknown' = current?.status ?? (iterationId ? 'unknown' : 'unknown');

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const pick = async (nextId: string | null) => {
    if (!canEdit || pending) return;
    if (nextId === iterationId) {
      close();
      return;
    }
    setPending(true);
    try {
      await onReassign(taskId, nextId);
      close();
    } finally {
      setPending(false);
    }
  };

  const hasAnySprints = activeSprints.length + planningSprints.length > 0;

  const trigger = (
    <button
      type="button"
      disabled={!canEdit || pending}
      onClick={() => canEdit && setOpen((v) => !v)}
      className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-left text-xs font-medium transition-colors ${
        displayName
          ? chipClasses(statusForChip)
          : 'text-slate-400 dark:text-slate-500'
      } ${canEdit ? 'hover:opacity-90' : 'cursor-default'} disabled:opacity-60`}
      data-testid={`sprint-cell-trigger-${taskId}`}
    >
      {displayName ? (
        <span className="truncate">{displayName}</span>
      ) : (
        <span>—</span>
      )}
    </button>
  );

  return (
    <div className="relative min-w-0" ref={rootRef}>
      {!canEdit ? (
        <span
          className={`inline-flex max-w-full rounded-md px-2 py-0.5 text-xs font-medium ${
            displayName ? chipClasses(statusForChip) : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {displayName ? <span className="truncate">{displayName}</span> : '—'}
        </span>
      ) : (
        trigger
      )}

      {open && canEdit && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-[100] mt-1 min-w-[14rem] max-w-[min(18rem,80vw)] rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900 dark:shadow-slate-950/40"
        >
          {!hasAnySprints && (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              No sprints created for this project yet.
            </div>
          )}

          {activeSprints.length > 0 && (
            <div className="px-2 pt-1">
              <div className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Active
              </div>
              {activeSprints.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={pending}
                  onClick={() => void pick(s.id)}
                  className={`flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    s.id === iterationId ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {s.name}
                  {s.id === iterationId ? ' · current' : ''}
                </button>
              ))}
            </div>
          )}

          {planningSprints.length > 0 && (
            <div className="px-2 pt-1">
              <div className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Upcoming
              </div>
              {planningSprints.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={pending}
                  onClick={() => void pick(s.id)}
                  className={`flex w-full rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    s.id === iterationId ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {s.name}
                  {s.id === iterationId ? ' · current' : ''}
                </button>
              ))}
            </div>
          )}

          {hasAnySprints && <div className="my-1 border-t border-slate-100 dark:border-slate-700" />}

          <div className="px-2 pb-1">
            <button
              type="button"
              disabled={pending || iterationId === null}
              onClick={() => void pick(null)}
              className="flex w-full rounded px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Backlog (no sprint)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
