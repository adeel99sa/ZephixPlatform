/**
 * Phase 2B: Gantt Schedule Tab
 *
 * Renders phases and tasks on a timeline using gantt-task-react.
 * Supports: read-only view, drag-move, drag-resize, critical path highlight.
 * Uses planned schedule fields (plannedStartAt, plannedEndAt) when available.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/hooks/useAuth';
import { isPlatformViewer } from '@/utils/access';
import { BarChart3, AlertCircle, Diamond, Eye } from 'lucide-react';
import { getProjectSchedule, patchTaskSchedule, type ScheduleTask, type ScheduleDependency } from '@/features/work-management/schedule.api';

import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';

export const ProjectGanttTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const isGuest = isPlatformViewer(user);

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

    for (const task of tasks) {
      const start = task.plannedStartAt || task.startDate;
      const end = task.plannedEndAt || task.dueDate;
      if (!start && !end) continue;

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
  }, [tasks, deps, criticalIds, showCritical]);

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

  const unscheduledCount = tasks.filter(
    (t) => !t.plannedStartAt && !t.plannedEndAt && !t.startDate && !t.dueDate,
  ).length;

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
          <BarChart3 className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Gantt Chart</h2>
          <span className="text-sm text-slate-500 ml-2">{tasks.length} tasks</span>
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
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Diamond className="h-3.5 w-3.5" />
            Critical Path
          </button>
        </div>
      </div>

      {ganttTasks.length > 0 ? (
        <div className="border rounded-lg overflow-hidden bg-white">
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
              const scheduleTask = tasks.find((t) => t.id === task.id);
              const isCritical = criticalIds.has(task.id);
              return (
                <div className="p-2 bg-white border rounded shadow-lg text-sm max-w-xs">
                  <p className="font-medium">{task.name}</p>
                  <p className="text-slate-500">
                    {dayjs(task.start).format('MMM DD')} -{' '}
                    {dayjs(task.end).format('MMM DD, YYYY')}
                  </p>
                  <p className="text-slate-500">Progress: {task.progress}%</p>
                  {isCritical && (
                    <p className="text-red-600 font-medium text-xs mt-1">
                      Critical Path • Float:{' '}
                      {scheduleTask?.totalFloatMinutes != null
                        ? `${Math.round(scheduleTask.totalFloatMinutes / 60)}h`
                        : 'N/A'}
                    </p>
                  )}
                  {task.dependencies && task.dependencies.length > 0 && (
                    <p className="text-slate-500 text-xs">
                      Dependencies: {task.dependencies.length}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-white rounded-lg border">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p>No scheduled tasks to display.</p>
          <p className="text-sm text-slate-400 mt-1">
            Set planned dates on tasks to see them on the Gantt chart.
          </p>
        </div>
      )}

      {unscheduledCount > 0 && (
        <p className="mt-3 text-sm text-slate-500">
          {unscheduledCount} task{unscheduledCount !== 1 ? 's' : ''} without dates (not shown)
        </p>
      )}
    </div>
  );
};

export default ProjectGanttTab;
