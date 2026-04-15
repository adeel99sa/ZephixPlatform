/**
 * My Work — cross-workspace queue of work assigned to the current user.
 * Org-level surface: uses GET /api/my-work; row navigation sets workspace then opens project task.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useWorkspaceStore } from '@/state/workspace.store';
import {
  assignOpenBucket,
  isOpenItem,
  OPEN_BUCKET_ORDER,
  OPEN_BUCKET_LABEL,
  type OpenBucketKey,
} from '@/pages/my-work/myWorkBuckets';

const MY_WORK_RESPONSE_LIMIT = 200;

type WorkItemStatus = 'todo' | 'in_progress' | 'done';

type MyWorkItem = {
  id: string;
  title: string;
  status: WorkItemStatus;
  dueDate?: string | null;
  updatedAt: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
};

type MyWorkResponse = {
  version: number;
  counts: {
    total: number;
    overdue: number;
    dueSoon7Days: number;
    inProgress: number;
    todo: number;
    done: number;
  };
  items: MyWorkItem[];
};

type MainTab = 'open' | 'completed';

function formatStatusLabel(status: WorkItemStatus): string {
  switch (status) {
    case 'todo':
      return 'To do';
    case 'in_progress':
      return 'In progress';
    case 'done':
      return 'Done';
    default:
      return status;
  }
}

function statusPillClass(status: WorkItemStatus): string {
  switch (status) {
    case 'todo':
      return 'bg-slate-100 text-slate-800';
    case 'in_progress':
      return 'bg-blue-50 text-blue-800';
    case 'done':
      return 'bg-emerald-50 text-emerald-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function isOverdueRow(item: MyWorkItem, now: Date): boolean {
  if (item.status === 'done' || !item.dueDate) return false;
  const due = new Date(item.dueDate);
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dueYmd = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  return dueYmd < todayYmd;
}

function itemMatchesSearch(item: MyWorkItem, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return (
    item.title.toLowerCase().includes(q) ||
    item.workspaceName.toLowerCase().includes(q) ||
    item.projectName.toLowerCase().includes(q)
  );
}

export default function MyWorkPage() {
  const navigate = useNavigate();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const [data, setData] = useState<MyWorkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MainTab>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [now] = useState(() => new Date());

  const loadMyWork = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await request.get<MyWorkResponse | undefined>('/my-work');
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setData({
        version: typeof payload?.version === 'number' ? payload.version : 1,
        counts:
          payload?.counts ?? {
            total: items.length,
            overdue: 0,
            dueSoon7Days: 0,
            inProgress: 0,
            todo: 0,
            done: 0,
          },
        items,
      });
    } catch (err: unknown) {
      console.error('Failed to load my work:', err);
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response
        ?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 403) {
        setError('You do not have access to My Work for this organization.');
      } else {
        setError(message || 'Failed to load your assigned work.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyWork();
  }, [loadMyWork]);

  const openItems = useMemo(
    () => (data?.items ?? []).filter((i) => isOpenItem(i)),
    [data?.items],
  );

  const completedItems = useMemo(() => {
    const done = (data?.items ?? []).filter((i) => i.status === 'done');
    return [...done].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [data?.items]);

  const filteredOpenItems = useMemo(
    () => openItems.filter((i) => itemMatchesSearch(i, searchQuery)),
    [openItems, searchQuery],
  );

  const filteredCompletedItems = useMemo(
    () => completedItems.filter((i) => itemMatchesSearch(i, searchQuery)),
    [completedItems, searchQuery],
  );

  const buckets = useMemo(() => {
    const map: Record<OpenBucketKey, MyWorkItem[]> = {
      overdue: [],
      today: [],
      next7: [],
      later: [],
      unscheduled: [],
    };
    for (const item of filteredOpenItems) {
      const k = assignOpenBucket(item, now);
      map[k].push(item);
    }
    const byDueThenTitle = (a: MyWorkItem, b: MyWorkItem) => {
      if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      const t = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return t !== 0 ? t : a.title.localeCompare(b.title);
    };
    for (const k of OPEN_BUCKET_ORDER) {
      map[k].sort(byDueThenTitle);
    }
    return map;
  }, [filteredOpenItems, now]);

  const handleOpenRow = (item: MyWorkItem) => {
    setActiveWorkspace(item.workspaceId);
    navigate(`/projects/${item.projectId}?taskId=${item.id}`);
  };

  if (loading) {
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
          <Button className="mt-4" onClick={() => loadMyWork()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-slate-600">
        Unable to display My Work. Please refresh the page.
      </div>
    );
  }

  const atResponseCap = data.items.length >= MY_WORK_RESPONSE_LIMIT;
  const hasAnyTasks = data.items.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="my-work-page">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Work</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          All actionable work assigned to you across workspaces and projects you can access. Open a row to
          work the task in its project.
        </p>
        {atResponseCap && (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 inline-block">
            Showing up to {MY_WORK_RESPONSE_LIMIT} assigned tasks. If your list is longer, not all items
            appear here until pagination is added.
          </p>
        )}
      </header>

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1 w-fit" role="tablist" aria-label="My Work views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'open'}
          data-testid="my-work-tab-open"
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'open' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setTab('open')}
        >
          Open
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'completed'}
          data-testid="my-work-tab-completed"
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            tab === 'completed'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={() => setTab('completed')}
        >
          Completed
        </button>
      </div>

      {hasAnyTasks && (
        <div className="mb-6 max-w-xl">
          <label htmlFor="my-work-search" className="sr-only">
            Search tasks by title, workspace, or project
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by task, workspace, or project"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery ? (
              <button
                type="button"
                data-testid="my-work-search-clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'open' && (
        <div data-testid="my-work-panel-open">
          {openItems.length === 0 ? (
            <div
              className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
              data-testid="my-work-empty-open"
            >
              <p className="text-sm font-medium text-slate-900">No open assigned work</p>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                When tasks are assigned to you in projects you can access, they will show up here. Check
                your workspaces and project task lists, or ask a lead to assign the next piece of work.
              </p>
            </div>
          ) : filteredOpenItems.length === 0 ? (
            <div
              className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
              data-testid="my-work-search-no-results-open"
            >
              <p className="text-sm font-medium text-slate-900">No tasks match your search</p>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Try another task name, workspace, or project. Clear the search to see all open work.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {OPEN_BUCKET_ORDER.map((key) => {
                const list = buckets[key];
                if (list.length === 0) return null;
                return (
                  <section key={key} data-testid={`my-work-bucket-${key}`} aria-label={OPEN_BUCKET_LABEL[key]}>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {OPEN_BUCKET_LABEL[key]}{' '}
                      <span className="font-normal text-slate-400">({list.length})</span>
                    </h2>
                    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                      {list.map((item) => (
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
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {item.workspaceName} · {item.projectName}
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
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div data-testid="my-work-panel-completed">
          {completedItems.length === 0 ? (
            <div
              className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
              data-testid="my-work-empty-completed"
            >
              <p className="text-sm font-medium text-slate-900">No completed items</p>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Completed tasks you were assigned will appear here once marked done in their projects.
              </p>
            </div>
          ) : filteredCompletedItems.length === 0 ? (
            <div
              className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
              data-testid="my-work-search-no-results-completed"
            >
              <p className="text-sm font-medium text-slate-900">No completed tasks match your search</p>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Try another keyword or clear the search to see all completed work.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {filteredCompletedItems.map((item) => (
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
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.workspaceName} · {item.projectName}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-slate-500 tabular-nums">
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
