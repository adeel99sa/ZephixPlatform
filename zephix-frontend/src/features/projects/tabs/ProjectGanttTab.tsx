/**
 * Wave 1: Gantt Read-Only Tab
 *
 * Renders phases and tasks on a timeline using gantt-task-react.
 * Dependencies are shown as arrow lines between tasks.
 * No editing in v1.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listTasks, type WorkTask } from '@/features/work-management/workTasks.api';
import { request } from '@/lib/api';
import { BarChart3, AlertCircle } from 'lucide-react';

// gantt-task-react types
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import dayjs from 'dayjs';

interface Phase {
  id: string;
  name: string;
  startDate?: string;
  dueDate?: string;
}

interface DependencyEdge {
  predecessorTaskId: string;
  successorTaskId: string;
}

export const ProjectGanttTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [dependencies, setDependencies] = useState<DependencyEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks, phases, and dependencies in parallel
      const [tasksResult, phasesResult] = await Promise.all([
        listTasks({ projectId, limit: 200 }),
        request.get<any>(`/work/projects/${projectId}/plan`).catch(() => null),
      ]);

      const allTasks = tasksResult.items;
      setTasks(allTasks);

      // Extract phases from plan response
      const planPhases = phasesResult?.phases || phasesResult?.data?.phases || [];
      setPhases(planPhases);

      // Fetch dependencies for all tasks
      const depEdges: DependencyEdge[] = [];
      const taskIds = allTasks.map((t: WorkTask) => t.id);
      // Batch: load dependencies for first N tasks to avoid hammering the API
      const depPromises = taskIds.slice(0, 50).map((tid: string) =>
        request.get<any>(`/work/tasks/${tid}/dependencies`).catch(() => null)
      );
      const depResults = await Promise.all(depPromises);
      for (const result of depResults) {
        if (!result) continue;
        const predecessors = result.predecessors || [];
        const successors = result.successors || [];
        for (const dep of predecessors) {
          depEdges.push({
            predecessorTaskId: dep.predecessorTaskId || dep.predecessor_task_id,
            successorTaskId: dep.successorTaskId || dep.successor_task_id,
          });
        }
        for (const dep of successors) {
          depEdges.push({
            predecessorTaskId: dep.predecessorTaskId || dep.predecessor_task_id,
            successorTaskId: dep.successorTaskId || dep.successor_task_id,
          });
        }
      }
      // Deduplicate
      const seen = new Set<string>();
      const unique = depEdges.filter(e => {
        const key = `${e.predecessorTaskId}-${e.successorTaskId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setDependencies(unique);
    } catch (err: any) {
      console.error('Gantt: failed to load data', err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build gantt tasks from phases and tasks
  const ganttTasks: GanttTask[] = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result: GanttTask[] = [];

    // Build a dependency map: taskId -> predecessorTaskIds
    const depMap = new Map<string, string[]>();
    for (const dep of dependencies) {
      const existing = depMap.get(dep.successorTaskId) || [];
      existing.push(dep.predecessorTaskId);
      depMap.set(dep.successorTaskId, existing);
    }

    // Add phases as project-type rows
    for (const phase of phases) {
      result.push({
        start: phase.startDate ? new Date(phase.startDate) : now,
        end: phase.dueDate ? new Date(phase.dueDate) : weekFromNow,
        name: phase.name || 'Unnamed Phase',
        id: phase.id,
        type: 'project',
        progress: 0,
        hideChildren: false,
      });
    }

    // Add tasks
    const activeTasks = tasks.filter(t => !t.deletedAt);
    for (const task of activeTasks) {
      const statusProgress: Record<string, number> = {
        DONE: 100,
        CANCELED: 100,
        IN_REVIEW: 80,
        IN_PROGRESS: 40,
        BLOCKED: 20,
        TODO: 0,
        BACKLOG: 0,
      };

      const statusColor: Record<string, string> = {
        DONE: '#10b981',
        IN_PROGRESS: '#f59e0b',
        IN_REVIEW: '#8b5cf6',
        BLOCKED: '#ef4444',
        TODO: '#6b7280',
        BACKLOG: '#94a3b8',
        CANCELED: '#9ca3af',
      };

      const deps = depMap.get(task.id) || [];

      result.push({
        start: task.startDate ? new Date(task.startDate) : now,
        end: task.dueDate ? new Date(task.dueDate) : weekFromNow,
        name: task.title,
        id: task.id,
        type: 'task',
        progress: statusProgress[task.status] ?? 0,
        project: task.phaseId || undefined,
        dependencies: deps,
        styles: {
          progressColor: statusColor[task.status] || '#6b7280',
          progressSelectedColor: statusColor[task.status] || '#4b5563',
        },
      });
    }

    return result;
  }, [tasks, phases, dependencies]);

  // Separate unscheduled tasks (no start or due date)
  const unscheduledTasks = tasks.filter(t => !t.deletedAt && !t.startDate && !t.dueDate);
  const scheduledGanttTasks = ganttTasks.filter(gt => {
    if (gt.type === 'project') return true;
    const task = tasks.find(t => t.id === gt.id);
    return task && (task.startDate || task.dueDate);
  });

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
          <p className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Error loading Gantt</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadData} className="mt-2 text-sm text-red-700 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="gantt-root">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Gantt Chart</h2>
        <span className="text-sm text-slate-500 ml-2">{tasks.filter(t => !t.deletedAt).length} tasks</span>
      </div>

      {scheduledGanttTasks.length > 0 ? (
        <div className="border rounded-lg overflow-hidden bg-white">
          <Gantt
            tasks={scheduledGanttTasks}
            viewMode={ViewMode.Week}
            locale="en"
            barBackgroundColor="#3b82f6"
            barBackgroundSelectedColor="#1d4ed8"
            arrowColor="#6b7280"
            arrowIndent={20}
            todayColor="rgba(239, 68, 68, 0.2)"
            TooltipContent={({ task }) => (
              <div className="p-2 bg-white border rounded shadow-lg text-sm">
                <p className="font-medium">{task.name}</p>
                <p className="text-slate-500">
                  {dayjs(task.start).format('MMM DD')} - {dayjs(task.end).format('MMM DD, YYYY')}
                </p>
                <p className="text-slate-500">Progress: {task.progress}%</p>
                {task.dependencies && task.dependencies.length > 0 && (
                  <p className="text-slate-500">Dependencies: {task.dependencies.length}</p>
                )}
              </div>
            )}
          />
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 bg-white rounded-lg border">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p>No scheduled tasks to display on the Gantt chart.</p>
          <p className="text-sm text-slate-400 mt-1">Add start and due dates to tasks to see them here.</p>
        </div>
      )}

      {/* Unscheduled tasks section */}
      {unscheduledTasks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            Unscheduled ({unscheduledTasks.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unscheduledTasks.map(task => (
              <div
                key={task.id}
                className="bg-white border border-slate-200 rounded-md p-3 text-sm"
              >
                <p className="font-medium text-slate-900">{task.title}</p>
                <p className="text-xs text-slate-400 mt-1">No dates set</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectGanttTab;
