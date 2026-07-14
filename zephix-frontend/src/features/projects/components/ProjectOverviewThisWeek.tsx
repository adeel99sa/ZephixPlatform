import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTasks, type WorkTask, type WorkTaskStatus } from '@/features/work-management/workTasks.api';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';
import { GradientAvatar } from '@/components/ui/GradientAvatar';

const CLOSED_STATUSES = new Set(['DONE', 'COMPLETED', 'CANCELED', 'CANCELLED']);

function getWorkWeekRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const fmtLabel = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    from: monday.toISOString(),
    to: friday.toISOString(),
    label: `${fmtLabel(monday)}–${fmtLabel(friday)}`,
  };
}

function statusDotClass(status: WorkTaskStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
      return 'bg-blue-500';
    case 'BLOCKED':
      return 'bg-amber-500';
    case 'DONE':
      return 'bg-emerald-500';
    case 'CANCELED':
      return 'bg-slate-400';
    default:
      return 'bg-slate-300';
  }
}

function daysLate(dueDate: string): number {
  const due = new Date(dueDate.slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function assigneeDisplayName(task: WorkTask, membersById: Map<string, string>): string {
  if (!task.assigneeUserId) return '?';
  return membersById.get(task.assigneeUserId) ?? '?';
}

function workspaceMemberDisplayName(m: {
  name?: string | null;
  email?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}): string {
  if (m.name) return m.name;
  if (m.user?.firstName || m.user?.lastName) {
    return `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim();
  }
  return m.user?.email || m.email || '?';
}

interface ProjectOverviewThisWeekProps {
  projectId: string;
  workspaceId: string;
}

export function ProjectOverviewThisWeek({
  projectId,
  workspaceId,
}: ProjectOverviewThisWeekProps) {
  const navigate = useNavigate();
  const week = useMemo(() => getWorkWeekRange(), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [items, setItems] = useState<WorkTask[]>([]);
  const [total, setTotal] = useState(0);
  const [memberNameByUserId, setMemberNameByUserId] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const members = await listWorkspaceMembers(workspaceId);
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const m of members) {
          const uid = m.userId || m.user?.id;
          if (uid) map.set(uid, workspaceMemberDisplayName(m));
        }
        setMemberNameByUserId(map);
      } catch {
        if (!cancelled) setMemberNameByUserId(new Map());
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const result = await listTasks({
          projectId,
          dueFrom: week.from,
          dueTo: week.to,
          sortBy: 'dueDate',
          sortDir: 'asc',
          limit: 5,
        });
        if (!cancelled) {
          setItems(Array.isArray(result.items) ? result.items : []);
          setTotal(result.total ?? result.items?.length ?? 0);
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setLoadError('Failed to load tasks due this week.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, week.from, week.to]);

  const retryWeekTasks = () => {
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const result = await listTasks({
          projectId,
          dueFrom: week.from,
          dueTo: week.to,
          sortBy: 'dueDate',
          sortDir: 'asc',
          limit: 5,
        });
        setItems(Array.isArray(result.items) ? result.items : []);
        setTotal(result.total ?? result.items?.length ?? 0);
        setLoadError(null);
      } catch {
        setItems([]);
        setTotal(0);
        setLoadError('Failed to load tasks due this week.');
      } finally {
        setLoading(false);
      }
    })();
  };

  const openActivities = () => {
    navigate(`/projects/${projectId}/tasks`);
  };

  const openTask = (taskId: string) => {
    navigate(`/projects/${projectId}/tasks?taskId=${encodeURIComponent(taskId)}`);
  };

  const moreCount = Math.max(0, total - items.length);

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
      data-testid="overview-this-week"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">This Week</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{week.label}</p>
        </div>
        <button
          type="button"
          onClick={openActivities}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Open Activities →
        </button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading this week tasks">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-900/40"
            >
              <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-600" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-900 dark:bg-red-950/40"
          role="alert"
          data-testid="overview-this-week-error"
        >
          <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={retryWeekTasks}
            className="mt-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No tasks due this week —{' '}
          <button
            type="button"
            onClick={openActivities}
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            open Activities to plan ahead →
          </button>
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((task) => {
              const overdue =
                task.dueDate &&
                !CLOSED_STATUSES.has(task.status) &&
                task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
              const lateDays = task.dueDate && overdue ? daysLate(task.dueDate) : 0;
              const assigneeName = assigneeDisplayName(task, memberNameByUserId);

              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => openTask(task.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/50"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(task.status)}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {task.title}
                    </span>
                    <GradientAvatar name={assigneeName} size={24} />
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        overdue
                          ? 'font-medium text-red-600 dark:text-red-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                      {lateDays > 0 ? ` · ${lateDays}d late` : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {moreCount > 0 && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              + {moreCount} more ·{' '}
              <button
                type="button"
                onClick={openActivities}
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Open Activities to see all
              </button>
            </p>
          )}
        </>
      )}
    </section>
  );
}
