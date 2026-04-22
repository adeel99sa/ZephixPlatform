/**
 * Phase 2B: Gantt Schedule Tab
 *
 * Renders phases and tasks on a timeline using gantt-task-react.
 * Supports: read-only view, drag-move, drag-resize, critical path highlight.
 * Uses planned schedule fields (plannedStartAt, plannedEndAt) when available.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformViewer } from '@/utils/access';
import { BarChart3, AlertCircle, Diamond, Eye } from 'lucide-react';
import { getProjectSchedule, patchTaskSchedule, type ScheduleTask, type ScheduleDependency } from '@/features/work-management/schedule.api';
import { filtersFromParams, type TaskFilters } from '@/features/projects/components/FilterBar';
import { WORK_SURFACE_QUERY } from '@/features/projects/workSurface/workSurfaceQuery';
import {
  parseSortDir,
  parseWorkSurfaceSortKey,
  type WorkSurfaceSortKey,
} from '@/features/projects/workSurface/workSurfaceTaskSort';

import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';

/** True when the task can draw a bar (non-milestone needs both start and end anchors). */
function scheduleHasTimelineBar(t: ScheduleTask): boolean {
  const start = t.plannedStartAt || t.startDate || t.actualStartAt;
  const end = t.plannedEndAt || t.dueDate || t.actualEndAt;
  if (t.isMilestone) return Boolean(start || end);
  return Boolean(start && end);
}

/** Subset of FilterBar rules that apply to schedule rows (no assignee/priority/type/tags on DTO). */
function scheduleTaskMatchesFilters(t: ScheduleTask, f: TaskFilters): boolean {
  if (f.status?.length && !f.status.includes(t.status)) return false;
  if (f.phaseId?.length) {
    const pid = t.phaseId ?? '';
    if (!pid || !f.phaseId.includes(pid)) return false;
  }
  if (f.dueFrom || f.dueTo) {
    if (!t.dueDate) return false;
    const slice = t.dueDate.slice(0, 10);
    if (f.dueFrom && slice < f.dueFrom) return false;
    if (f.dueTo && slice > f.dueTo) return false;
  }
  return true;
}

function compareScheduleTasks(
  a: ScheduleTask,
  b: ScheduleTask,
  key: WorkSurfaceSortKey,
  dir: 'asc' | 'desc',
): number {
  const m = dir === 'desc' ? -1 : 1;
  const due = (x: ScheduleTask) => {
    const d = x.dueDate;
    if (!d) return Number.NaN;
    const t = new Date(d).getTime();
    return Number.isFinite(t) ? t : Number.NaN;
  };
  if (key === 'default' || key === 'title') {
    const c = a.title.localeCompare(b.title);
    return m * (c !== 0 ? c : a.id.localeCompare(b.id));
  }
  if (key === 'dueDate') {
    const ta = due(a);
    const tb = due(b);
    const aNa = Number.isNaN(ta);
    const bNa = Number.isNaN(tb);
    if (aNa && bNa) return m * a.id.localeCompare(b.id);
    if (aNa) return m * 1;
    if (bNa) return m * -1;
    if (ta !== tb) return m * (ta - tb);
    return m * a.id.localeCompare(b.id);
  }
  if (key === 'status') {
    const c = a.status.localeCompare(b.status);
    return m * (c !== 0 ? c : a.id.localeCompare(b.id));
  }
  const c = a.title.localeCompare(b.title);
  return m * (c !== 0 ? c : a.id.localeCompare(b.id));
}

function sortScheduleTasks(
  list: ScheduleTask[],
  key: WorkSurfaceSortKey,
  dir: 'asc' | 'desc',
): ScheduleTask[] {
  return [...list].sort((a, b) => compareScheduleTasks(a, b, key, dir));
}

export const ProjectGanttTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const isGuest = isPlatformViewer(user);

  const urlFilters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const taskQ = searchParams.get(WORK_SURFACE_QUERY.taskQ) ?? '';
  const sortKey = useMemo(
    () => parseWorkSurfaceSortKey(searchParams.get(WORK_SURFACE_QUERY.sort)),
    [searchParams],
  );
  const sortDir = useMemo(
    () => parseSortDir(searchParams.get(WORK_SURFACE_QUERY.sortDir)),
    [searchParams],
  );

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [deps, setDeps] = useState<ScheduleDependency[]>([]);
  const [criticalIds, setCriticalIds] = useState<Set<string>>(new Set());
  const [showCritical, setShowCritical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectSchedule(projectId, {
        mode: 'planned',
        includeCritical: true,
      });
      setTasks(data.tasks || []);
      setDeps(data.dependencies || []);
      setCriticalIds(new Set(data.criticalPathTaskIds || []));
    } catch (err: any) {
      console.error('Gantt: failed to load', err);
      setError(err?.message || 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const visibleScheduleTasks = useMemo(() => {
    let list = tasks.filter((t) => scheduleTaskMatchesFilters(t, urlFilters));
    const q = taskQ.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }
    return sortScheduleTasks(list, sortKey, sortDir);
  }, [tasks, urlFilters, taskQ, sortKey, sortDir]);

  const tasksWithoutTimelineBar = useMemo(
    () => visibleScheduleTasks.filter((t) => !scheduleHasTimelineBar(t)),
    [visibleScheduleTasks],
  );
  const tasksWithoutTimelineCount = tasksWithoutTimelineBar.length;

  const sidebarTasks = visibleScheduleTasks;

  // Build gantt tasks
  const ganttTasks: GanttTask[] = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    const result: GanttTask[] = [];

    const depMap = new Map<string, string[]>();
    for (const d of deps) {
      const existing = depMap.get(d.successorTaskId) || [];
      existing.push(d.predecessorTaskId);
      depMap.set(d.successorTaskId, existing);
    }

    const visibleIds = new Set(visibleScheduleTasks.map((t) => t.id));

    for (const task of tasks) {
      if (!visibleIds.has(task.id)) continue;
      if (!scheduleHasTimelineBar(task)) continue;

      const start = task.plannedStartAt || task.startDate || task.actualStartAt;
      const end = task.plannedEndAt || task.dueDate || task.actualEndAt;

      const isCritical = criticalIds.has(task.id);
      const depIds = depMap.get(task.id) || [];

      const criticalColor = '#ef4444';
      const normalColor = '#3b82f6';
      const milestoneColor = '#8b5cf6';

      let barColor = normalColor;
      if (showCritical && isCritical) barColor = criticalColor;
      if (task.isMilestone) barColor = milestoneColor;

      result.push({
        start: start ? new Date(start) : now,
        end: end ? new Date(end) : weekFromNow,
        name: task.isMilestone ? `◆ ${task.title}` : task.title,
        id: task.id,
        type: task.isMilestone ? 'milestone' : 'task',
        progress: task.percentComplete || 0,
        dependencies: depIds,
        styles: {
          progressColor: barColor,
          progressSelectedColor: barColor,
          backgroundColor: showCritical && isCritical ? '#fecaca' : undefined,
        },
      });
    }

    return result;
  }, [tasks, visibleScheduleTasks, deps, criticalIds, showCritical]);

  const handleDateChange = useCallback(
    async (ganttTask: GanttTask) => {
      if (isGuest || !projectId) return;
      try {
        const result = await patchTaskSchedule(projectId, ganttTask.id, {
          plannedStartAt: ganttTask.start.toISOString(),
          plannedEndAt: ganttTask.end.toISOString(),
          cascade: 'forward',
        });
        if (result.violations.length > 0) {
          setToast(`Warning: ${result.violations.join(', ')}`);
          setTimeout(() => setToast(null), 5000);
        }
        if (result.cascadedTaskIds.length > 0) {
          setToast(`Moved task and cascaded to ${result.cascadedTaskIds.length} successor(s)`);
          setTimeout(() => setToast(null), 3000);
        }
        await loadData();
      } catch (err: any) {
        setToast(err?.response?.data?.message || 'Failed to update schedule');
        setTimeout(() => setToast(null), 5000);
      }
    },
    [projectId, isGuest, loadData],
  );

  const handleProgressChange = useCallback(
    async (ganttTask: GanttTask) => {
      if (isGuest || !projectId) return;
      try {
        await patchTaskSchedule(projectId, ganttTask.id, {
          percentComplete: Math.round(ganttTask.progress),
        });
        await loadData();
      } catch (err: any) {
        setToast(err?.response?.data?.message || 'Failed to update progress');
        setTimeout(() => setToast(null), 5000);
      }
    },
    [projectId, isGuest, loadData],
  );

  if (!projectId || !activeWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Select a workspace and project to view the Gantt chart.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="gantt-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="gantt-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Error loading Gantt
          </p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadData} className="mt-2 text-sm text-red-700 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="gantt-root">
      {/* Toast */}
      {toast && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          {toast}
        </div>
      )}

      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gantt Chart</h2>
          <span className="text-sm text-slate-500 ml-2 dark:text-slate-400">
            {visibleScheduleTasks.length} work item{visibleScheduleTasks.length !== 1 ? 's' : ''}
            {visibleScheduleTasks.length > 0 && (
              <>
                {' '}
                · {ganttTasks.length} on timeline
                {tasksWithoutTimelineCount > 0
                  ? ` · ${tasksWithoutTimelineCount} not on timeline (missing dates)`
                  : ''}
              </>
            )}
          </span>
          {isGuest && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 ml-2">
              <Eye className="h-3 w-3" /> Read-only
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCritical(!showCritical)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              showCritical
                ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/50'
                : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
            }`}
          >
            <Diamond className="h-3.5 w-3.5" />
            Critical Path
          </button>
        </div>
      </div>

      <div className="flex min-h-[min(70vh,560px)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:flex-row">
        {/* Left: all tasks — always visible */}
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 dark:border-slate-700 md:w-80 md:border-b-0 md:border-r">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
            Tasks ({visibleScheduleTasks.length})
          </div>
          <div className="max-h-[min(50vh,420px)] overflow-y-auto md:max-h-[min(70vh,560px)]">
            {sidebarTasks.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No tasks in this project.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800" role="list">
                {sidebarTasks.map((t) => {
                  const onTimeline = scheduleHasTimelineBar(t);
                  return (
                    <li key={t.id}>
                      <Link
                        to={`/projects/${projectId}/tasks?taskId=${encodeURIComponent(t.id)}`}
                        className="block px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {t.isMilestone ? `◆ ${t.title}` : t.title}
                          </span>
                          {!onTimeline && (
                            <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                              No dates
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {t.status.replace(/_/g, ' ')}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {projectId && sidebarTasks.length > 0 && (
            <div className="border-t border-slate-200 p-2 text-[11px] dark:border-slate-700">
              <Link
                to={`/projects/${projectId}/plan`}
                className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Open Plan to set dates
              </Link>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <Link
                to={`/projects/${projectId}/tasks`}
                className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Activities
              </Link>
            </div>
          )}
        </aside>

        {/* Right: timeline — bars only when dates exist */}
        <section className="flex min-h-[280px] min-w-0 flex-1 flex-col bg-white dark:bg-slate-900">
          {ganttTasks.length > 0 ? (
            <div className="min-h-[280px] flex-1 overflow-x-auto overflow-y-hidden">
              <Gantt
                tasks={ganttTasks}
                viewMode={ViewMode.Week}
                locale="en"
                barBackgroundColor="#3b82f6"
                barBackgroundSelectedColor="#1d4ed8"
                arrowColor="#6b7280"
                arrowIndent={20}
                todayColor="rgba(239, 68, 68, 0.2)"
                onDateChange={isGuest ? undefined : handleDateChange}
                onProgressChange={isGuest ? undefined : handleProgressChange}
                TooltipContent={({ task }) => {
                  const scheduleTask = tasks.find((st) => st.id === task.id);
                  const isCritical = criticalIds.has(task.id);
                  return (
                    <div className="max-w-xs rounded border border-slate-200 bg-white p-2 text-sm shadow-lg dark:border-slate-600 dark:bg-slate-800">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{task.name}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {dayjs(task.start).format('MMM DD')} -{' '}
                        {dayjs(task.end).format('MMM DD, YYYY')}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">Progress: {task.progress}%</p>
                      {isCritical && (
                        <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          Critical Path • Float:{' '}
                          {scheduleTask?.totalFloatMinutes != null
                            ? `${Math.round(scheduleTask.totalFloatMinutes / 60)}h`
                            : 'N/A'}
                        </p>
                      )}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Dependencies: {task.dependencies.length}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-slate-500 dark:text-slate-400">
              <BarChart3 className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              {tasks.length === 0 ? (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No tasks yet</p>
              ) : (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-200">No bars on the timeline yet</p>
                  <p className="max-w-md text-sm">
                    Tasks need both a start and an end date (planned or actual) to appear as bars.
                    Use the list on the left to open a task in Activities and add dates.
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProjectGanttTab;
