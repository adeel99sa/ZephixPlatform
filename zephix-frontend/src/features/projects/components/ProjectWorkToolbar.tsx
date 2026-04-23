/**
 * Shared toolbar for project work surfaces: Activities (/tasks), Board, Gantt.
 * Filter state is URL-driven (FilterBar); search / my tasks / group / sort use query params.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Filter,
  Layers,
  Loader2,
  Search,
  Settings,
  Shield,
  UserSquare2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaceMembers, type WorkspaceMemberRow } from '@/features/workspaces/members/api';
import { request } from '@/lib/api';
import type { WorkTaskStatus } from '@/features/work-management/workTasks.api';
import type { WorkTaskType } from '@/features/work-management/workTasks.api';
import {
  FilterBar,
  activeFilterCount,
  filtersFromParams,
} from '@/features/projects/components/FilterBar';
import { projectShowsGovernanceIndicator } from '@/features/projects/projects.api';
import { useProjectContext } from '@/features/projects/layout/ProjectPageLayout';
import {
  getDefaultGroupingForMethodology,
  normalizeMethodologyKey,
  useProjectSprints,
} from '@/features/projects/columns';
import type { GroupingKey } from '@/features/projects/columns/column-types';
import { WORK_SURFACE_QUERY } from '@/features/projects/workSurface/workSurfaceQuery';
import {
  parseSortDir,
  parseWorkSurfaceSortKey,
  type WorkSurfaceSortKey,
} from '@/features/projects/workSurface/workSurfaceTaskSort';
import { useWorkSurfaceUi } from '@/features/projects/layout/WorkSurfaceUiContext';

const STATUS_OPTIONS: WorkTaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'IN_REVIEW',
  'DONE',
  'CANCELED',
];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const TYPE_OPTIONS: WorkTaskType[] = ['TASK', 'EPIC', 'MILESTONE', 'BUG'];

function toolbarBtnClass(active: boolean): string {
  const base =
    'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900';
  if (active) {
    return `${base} border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200`;
  }
  return `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;
}

export const ProjectWorkToolbar: React.FC = () => {
  const ctx = useProjectContext();
  const project = ctx.project;
  const location = useLocation();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customizeViewOpen, setCustomizeViewOpen, gearRef } = useWorkSurfaceUi();

  const [filterOpen, setFilterOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const groupBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  const [members, setMembers] = useState<WorkspaceMemberRow[]>([]);
  const [phases, setPhases] = useState<Array<{ id: string; name: string }>>([]);

  const methodology = project?.methodology ?? 'agile';
  const projectId = project?.id ?? '';
  const { activeSprints, planningSprints } = useProjectSprints(projectId || undefined);

  const workSurfaceTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/board')) return 'board' as const;
    if (p.includes('/gantt')) return 'gantt' as const;
    if (p.includes('/tasks')) return 'tasks' as const;
    return null;
  }, [location.pathname]);

  const waterfallActivitiesCustomize =
    workSurfaceTab === 'tasks' && methodology.toLowerCase() === 'waterfall';

  const hasSprints =
    Boolean(project?.iterationsEnabled) || activeSprints.length > 0 || planningSprints.length > 0;

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listWorkspaceMembers(workspaceId);
        if (!cancelled) setMembers(rows ?? []);
      } catch {
        if (!cancelled) setMembers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!projectId || !workspaceId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await request.get<{ phases?: Array<{ id: string; name: string }> }>(
          `/work/projects/${projectId}/plan`,
          { headers: { 'x-workspace-id': workspaceId } },
        );
        const raw = (res as any)?.data?.phases ?? (res as any)?.phases ?? [];
        const list = Array.isArray(raw)
          ? raw.map((p: any) => ({ id: String(p.id), name: String(p.name ?? '') }))
          : [];
        if (!cancelled) setPhases(list);
      } catch {
        if (!cancelled) setPhases([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, workspaceId]);

  const taskSearch = searchParams.get(WORK_SURFACE_QUERY.taskQ) ?? '';
  const setTaskSearch = useCallback(
    (next: string) => {
      const merged = new URLSearchParams(searchParams);
      if (next.trim()) merged.set(WORK_SURFACE_QUERY.taskQ, next);
      else merged.delete(WORK_SURFACE_QUERY.taskQ);
      setSearchParams(merged, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const myTasksOnly = searchParams.get(WORK_SURFACE_QUERY.myTasks) === '1';
  const setMyTasksOnly = useCallback(
    (next: boolean) => {
      const merged = new URLSearchParams(searchParams);
      if (next) merged.set(WORK_SURFACE_QUERY.myTasks, '1');
      else merged.delete(WORK_SURFACE_QUERY.myTasks);
      setSearchParams(merged, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const hideDone = searchParams.get(WORK_SURFACE_QUERY.hideDone) === '1';
  const setHideDone = useCallback(
    (next: boolean) => {
      const merged = new URLSearchParams(searchParams);
      if (next) merged.set(WORK_SURFACE_QUERY.hideDone, '1');
      else merged.delete(WORK_SURFACE_QUERY.hideDone);
      setSearchParams(merged, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const filterCount = useMemo(
    () => activeFilterCount(filtersFromParams(searchParams)),
    [searchParams],
  );

  const effectiveGroupBy = useMemo((): GroupingKey => {
    const raw = searchParams.get(WORK_SURFACE_QUERY.groupBy);
    if (raw === 'phase' || raw === 'status') return raw;
    return getDefaultGroupingForMethodology(methodology);
  }, [searchParams, methodology]);

  const setGroupByParam = useCallback(
    (key: GroupingKey) => {
      const merged = new URLSearchParams(searchParams);
      merged.set(WORK_SURFACE_QUERY.groupBy, key);
      setSearchParams(merged, { replace: true });
      setGroupOpen(false);
    },
    [searchParams, setSearchParams],
  );

  const sortKey = useMemo(
    () => parseWorkSurfaceSortKey(searchParams.get(WORK_SURFACE_QUERY.sort)),
    [searchParams],
  );
  const sortDir = useMemo(
    () => parseSortDir(searchParams.get(WORK_SURFACE_QUERY.sortDir)),
    [searchParams],
  );

  const setSortParams = useCallback(
    (key: WorkSurfaceSortKey, dir: 'asc' | 'desc') => {
      const merged = new URLSearchParams(searchParams);
      if (key === 'default') {
        merged.delete(WORK_SURFACE_QUERY.sort);
        merged.delete(WORK_SURFACE_QUERY.sortDir);
      } else {
        merged.set(WORK_SURFACE_QUERY.sort, key);
        merged.set(WORK_SURFACE_QUERY.sortDir, dir);
      }
      setSearchParams(merged, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const filterBarOptions = useMemo(
    () => ({
      members,
      phases,
      statuses: STATUS_OPTIONS as unknown as string[],
      priorities: [...PRIORITY_OPTIONS],
      types: TYPE_OPTIONS as unknown as string[],
    }),
    [members, phases],
  );

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterPopoverRef.current?.contains(t)) return;
      if (filterBtnRef.current?.contains(t)) return;
      setFilterOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [filterOpen]);

  useEffect(() => {
    if (!groupOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (groupBtnRef.current?.contains(t)) return;
      setGroupOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [groupOpen]);

  if (!project) return null;

  const methKey = normalizeMethodologyKey(methodology);
  const scrumish = methKey === 'scrum' || methKey === 'agile';

  const onPickGroup = (value: string) => {
    if (value === 'phase' || value === 'status') {
      setGroupByParam(value as GroupingKey);
      return;
    }
    if (value === 'sprint' && !hasSprints) {
      toast.message('No sprints on this project yet.');
      setGroupOpen(false);
      return;
    }
    toast.message('Coming soon');
    setGroupOpen(false);
  };

  return (
    <div className="mb-1 flex flex-col gap-2 border-b border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {projectShowsGovernanceIndicator(project) && (
          <div
            className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400"
            title="Governance policies from this project's template may apply. You will be notified if an action needs an admin-approved exception."
          >
            <Shield className="h-3.5 w-3.5 shrink-0 text-purple-500" aria-hidden />
            <span className="hidden sm:inline">Policies active</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
        <div className="relative">
          <button
            ref={filterBtnRef}
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-label="Filter tasks"
            data-testid="project-tasks-toolbar-filter"
            className={toolbarBtnClass(filterOpen)}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
            {filterCount > 0 && (
              <span className="ml-0.5 inline-flex min-h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                {filterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <div
              ref={filterPopoverRef}
              className="absolute right-0 top-full z-50 mt-1 max-h-[min(70vh,420px)] w-[min(100vw-2rem,28rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
              role="dialog"
              aria-label="Filters"
            >
              <FilterBar options={filterBarOptions} className="flex-col items-stretch gap-2" />
            </div>
          )}
        </div>

        <div className="relative">
          <button
            ref={groupBtnRef}
            type="button"
            onClick={() => setGroupOpen((v) => !v)}
            aria-expanded={groupOpen}
            aria-label="Group tasks"
            data-testid="project-tasks-toolbar-group"
            className={toolbarBtnClass(groupOpen)}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden />
            Group
          </button>
          {groupOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"
              role="menu"
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Group by
              </div>
              {(
                [
                  { id: 'phase' as const, label: 'Phase', hint: 'waterfall / hybrid default' },
                  { id: 'status' as const, label: 'Status', hint: 'agile / scrum / kanban default' },
                  { id: 'assignee' as const, label: 'Assignee' },
                  { id: 'priority' as const, label: 'Priority' },
                  ...(scrumish && hasSprints
                    ? [{ id: 'sprint' as const, label: 'Sprint' }]
                    : []),
                  { id: 'none' as const, label: 'None' },
                ] as const
              ).map((row) => {
                const active = effectiveGroupBy === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => onPickGroup(row.id)}
                  >
                    <span className="w-3 shrink-0 text-center">{active ? '●' : '○'}</span>
                    <span>{row.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sort button removed — per-column sort via header chevrons is sufficient */}

        {/* Search — compact icon, expands on focus */}
        <div className={`relative transition-all duration-200 ${searchExpanded ? 'w-48' : 'w-8'}`}>
          {searchExpanded ? (
            <>
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden
              />
              <input
                ref={searchInputRef}
                type="search"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                onBlur={() => { if (!taskSearch) setSearchExpanded(false); }}
                placeholder="Search tasks…"
                aria-label="Search tasks"
                data-testid="project-tasks-toolbar-search"
                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              className={toolbarBtnClass(false)}
              aria-label="Search tasks"
              title="Search tasks"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="mx-1 hidden h-5 w-px shrink-0 bg-slate-200 sm:block dark:bg-slate-700" />

        <button
          type="button"
          aria-pressed={myTasksOnly}
          aria-label="Show only my assigned tasks"
          onClick={() => setMyTasksOnly(!myTasksOnly)}
          className={toolbarBtnClass(myTasksOnly)}
          data-testid="project-tasks-toolbar-my-tasks"
          title="Show only tasks assigned to you"
        >
          <UserSquare2 className="h-3.5 w-3.5" aria-hidden />
          My tasks
        </button>

        {/* Eye toggle — show/hide completed tasks */}
        <button
          type="button"
          aria-pressed={hideDone}
          aria-label={hideDone ? 'Show completed tasks' : 'Hide completed tasks'}
          onClick={() => setHideDone(!hideDone)}
          className={toolbarBtnClass(hideDone)}
          data-testid="project-tasks-toolbar-hide-done"
          title={hideDone ? 'Show completed tasks' : 'Hide completed tasks'}
        >
          {hideDone ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
        </button>

        <div className="mx-1 hidden h-5 w-px shrink-0 bg-slate-200 sm:block dark:bg-slate-700" />

        <div className="relative">
          <button
            ref={gearRef}
            type="button"
            onClick={() => setCustomizeViewOpen((v) => !v)}
            aria-label="Customize view"
            data-testid="customize-view-button"
            title="Customize view"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-slate-500 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus:ring-blue-900 ${
              customizeViewOpen
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200'
                : 'border-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
          </button>
          {customizeViewOpen && !waterfallActivitiesCustomize && (
            <NonWaterfallCustomizePopover
              onClose={() => setCustomizeViewOpen(false)}
              anchorRef={gearRef}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/** Anchored to the gear control when Activities/Board/Gantt are not Waterfall Activities. */
function NonWaterfallCustomizePopover({
  onClose,
  anchorRef,
}: {
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !(anchorRef?.current && anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
      role="dialog"
      aria-label="Customize view"
      data-testid="customize-view-panel"
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Settings className="h-4 w-4 text-slate-500" />
          Customize view
        </div>
      </div>
      <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Loader2 className="h-3.5 w-3.5" />
          <span className="font-medium">Coming soon</span>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-400">
          Column configuration for this project type will be available in a future release.
        </p>
      </div>
    </div>
  );
}
