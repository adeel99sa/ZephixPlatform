/**
 * My Work — cross-workspace queue of work assigned to the current user (MP-3).
 * Consumes GET /work/my-tasks (aggregates are filter-independent).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/state/workspace.store';
import {
  listMyTasks,
  type MyTaskRow,
  type MyTasksAggregates,
  type MyTasksBucket,
} from '@/pages/my-work/myWork.api';
import type { StandardError } from '@/lib/api/types';

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Stack-1 `request` rejects with {@link StandardError} (no Axios `.response`).
 * Read the normalized shape only — never `.response.*`.
 */
function readMyWorkApiError(err: unknown): Pick<StandardError, 'status' | 'message' | 'code'> {
  if (!err || typeof err !== 'object') {
    return { status: 500, message: 'Failed to load your assigned work.', code: 'SERVER_ERROR' };
  }
  const e = err as Partial<StandardError>;
  return {
    status: typeof e.status === 'number' ? e.status : 500,
    message:
      typeof e.message === 'string' && e.message.trim()
        ? e.message
        : 'Failed to load your assigned work.',
    code: typeof e.code === 'string' && e.code.trim() ? e.code : 'SERVER_ERROR',
  };
}

const BUCKET_TABS: { id: MyTasksBucket | 'all'; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

function formatStatusLabel(status: string): string {
  const key = status.trim().toUpperCase();
  switch (key) {
    case 'BACKLOG':
      return 'Backlog';
    case 'TODO':
      return 'To do';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'BLOCKED':
      return 'Blocked';
    case 'IN_REVIEW':
      return 'In review';
    case 'DONE':
      return 'Done';
    case 'CANCELED':
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

function statusPillClass(status: string): string {
  const key = status.trim().toUpperCase();
  switch (key) {
    case 'DONE':
      return 'bg-emerald-50 text-emerald-800';
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
      return 'bg-blue-50 text-blue-800';
    case 'BLOCKED':
      return 'bg-red-50 text-red-800';
    case 'CANCELED':
    case 'CANCELLED':
      return 'bg-slate-100 text-slate-500';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function isOverdueRow(item: MyTaskRow, now: Date): boolean {
  const st = item.status.trim().toUpperCase();
  if (st === 'DONE' || st === 'CANCELED' || st === 'CANCELLED' || !item.dueDate) return false;
  const due = new Date(item.dueDate);
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dueYmd = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  return dueYmd < todayYmd;
}

function AggregateBadge({
  label,
  count,
  tone,
  testId,
}: {
  label: string;
  count: number;
  tone: 'danger' | 'warn' | 'neutral' | 'muted';
  testId: string;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-900'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : tone === 'neutral'
          ? 'border-blue-200 bg-blue-50 text-blue-900'
          : 'border-slate-200 bg-slate-50 text-slate-800';
  return (
    <div
      data-testid={testId}
      className={`rounded-lg border px-3 py-2 ${toneClass}`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{count}</div>
    </div>
  );
}

export default function MyWorkPage() {
  const navigate = useNavigate();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [items, setItems] = useState<MyTaskRow[]>([]);
  const [aggregates, setAggregates] = useState<MyTasksAggregates>({
    overdueCount: 0,
    dueTodayCount: 0,
    dueThisWeekCount: 0,
    totalAssigned: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<MyTasksBucket | 'all'>('open');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [now] = useState(() => new Date());
  const requestGen = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadMyWork = useCallback(async () => {
    const gen = ++requestGen.current;
    setLoading(true);
    setError(null);
    try {
      const payload = await listMyTasks({
        bucket: bucket === 'all' ? undefined : bucket,
        search: searchQuery || undefined,
        sortBy: 'dueDate',
        sortDir: 'asc',
        limit: 50,
        offset: 0,
      });
      if (gen !== requestGen.current) return;
      setItems(payload.items);
      setAggregates(payload.aggregates);
      setTotal(payload.total);
    } catch (err: unknown) {
      if (gen !== requestGen.current) return;
      console.error('Failed to load my work:', err);
      const { status, message, code } = readMyWorkApiError(err);
      if (status === 403 || code === 'AUTH_FORBIDDEN' || code === 'FORBIDDEN') {
        setError('You do not have access to My Work for this organization.');
      } else {
        setError(message);
      }
      setItems([]);
    } finally {
      if (gen === requestGen.current) setLoading(false);
    }
  }, [bucket, searchQuery]);

  useEffect(() => {
    void loadMyWork();
  }, [loadMyWork]);

  const handleOpenRow = (item: MyTaskRow) => {
    setActiveWorkspace(item.workspaceId);
    navigate(`/projects/${item.projectId}?taskId=${item.id}`);
  };

  if (loading && items.length === 0 && !error) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">Unable to load My Work</h2>
          <p className="mt-2 text-sm text-red-800">{error}</p>
          <Button className="mt-4" onClick={() => void loadMyWork()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const emptyAllAssigned = aggregates.totalAssigned === 0 && !searchQuery && bucket === 'open';
  const emptyFiltered = !loading && items.length === 0 && !emptyAllAssigned;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="my-work-page">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Work</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Work assigned to you across workspaces and projects you can access. Open a row to work the
          task in its project.
        </p>
      </header>

      <div
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        data-testid="my-work-aggregates"
        aria-label="Assignment summary"
      >
        <AggregateBadge
          label="Overdue"
          count={aggregates.overdueCount}
          tone="danger"
          testId="my-work-agg-overdue"
        />
        <AggregateBadge
          label="Due today"
          count={aggregates.dueTodayCount}
          tone="warn"
          testId="my-work-agg-due-today"
        />
        <AggregateBadge
          label="This week"
          count={aggregates.dueThisWeekCount}
          tone="neutral"
          testId="my-work-agg-this-week"
        />
        <AggregateBadge
          label="Total"
          count={aggregates.totalAssigned}
          tone="muted"
          testId="my-work-agg-total"
        />
      </div>

      <div
        className="mb-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 w-fit"
        role="tablist"
        aria-label="My Work buckets"
      >
        {BUCKET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={bucket === tab.id}
            data-testid={`my-work-tab-${tab.id}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              bucket === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setBucket(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-6 max-w-xl">
        <label htmlFor="my-work-search" className="sr-only">
          Search tasks by title
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id="my-work-search"
            data-testid="my-work-search"
            type="search"
            autoComplete="off"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by task title"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {searchInput ? (
            <button
              type="button"
              data-testid="my-work-search-clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8" aria-label="Loading">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      ) : emptyAllAssigned ? (
        <div
          className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
          data-testid="my-work-empty"
        >
          <p className="text-sm font-medium text-slate-900">Nothing assigned to you yet</p>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            When tasks are assigned to you in projects you can access, they will show up here.
          </p>
        </div>
      ) : emptyFiltered ? (
        <div
          className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
          data-testid="my-work-empty-filtered"
        >
          <p className="text-sm font-medium text-slate-900">No tasks match this view</p>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Try another bucket or clear the search. Aggregate badges stay based on all open assigned
            work.
          </p>
        </div>
      ) : (
        <>
          {total > items.length ? (
            <p className="mb-3 text-xs text-slate-500">
              Showing {items.length} of {total} matching tasks.
            </p>
          ) : null}
          <ul
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
            data-testid="my-work-list"
          >
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  data-testid={`my-work-row-${item.id}`}
                  onClick={() => handleOpenRow(item)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusPillClass(item.status)}`}
                  >
                    {formatStatusLabel(item.status)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{item.title}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                        data-testid={`my-work-chip-ws-${item.id}`}
                      >
                        {item.workspaceName || 'Workspace'}
                      </span>
                      <span
                        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                        data-testid={`my-work-chip-project-${item.id}`}
                      >
                        {item.projectName || 'Project'}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {item.dueDate ? (
                      <span
                        className={`text-sm tabular-nums ${
                          isOverdueRow(item, now) ? 'font-medium text-red-600' : 'text-slate-600'
                        }`}
                      >
                        {new Date(item.dueDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">No date</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
