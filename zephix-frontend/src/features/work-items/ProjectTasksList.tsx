import { useEffect, useState } from 'react';
import { listWorkItemsByProject, updateWorkItemStatus, getCompletionRatioByProject } from './api';
import { WorkItem, WorkItemStatus } from './types';
import { telemetry } from '@/lib/telemetry';

interface Props {
  projectId: string;
}

export function ProjectTasksList({ projectId }: Props) {
  const [tasks, setTasks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  async function refresh() {
    setLoading(true);
    try {
      const list = await listWorkItemsByProject(projectId, statusFilter === 'all' ? undefined : statusFilter);
      setTasks(list);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [projectId, statusFilter]);

  async function toggleStatus(task: WorkItem) {
    const newStatus = task.status === WorkItemStatus.DONE ? WorkItemStatus.TODO : WorkItemStatus.DONE;
    try {
      await updateWorkItemStatus(task.id, newStatus);
      telemetry.track('task.status_toggled', { taskId: task.id, status: newStatus });
      await refresh();
      // Emit event to invalidate KPI cache
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
    } catch (e) {
      telemetry.track('task.toggle.error', { taskId: task.id, error: (e as Error).message });
      alert('Failed to update task status.');
    }
  }

  const statusCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === WorkItemStatus.TODO).length,
    in_progress: tasks.filter(t => t.status === WorkItemStatus.IN_PROGRESS).length,
    done: tasks.filter(t => t.status === WorkItemStatus.DONE).length,
  };

  return (
    <div data-testid="tasks-list" className="mt-6">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 px-3">
        <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">Tasks</span>
        <div className="flex gap-1">
          {(['all', 'todo', 'in_progress', 'done'] as const).map(filter => (
            <button
              key={filter}
              data-testid={`task-filter-${filter}`}
              className={`rounded px-2 py-1 text-xs ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'border text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setStatusFilter(filter)}
            >
              {filter} ({statusCounts[filter]})
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="animate-pulse space-y-2 px-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="px-3 py-4 text-sm text-gray-500 text-center" data-testid="tasks-empty">
          No tasks yet
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map(task => (
            <li
              key={task.id}
              data-testid={`task-row-${task.id}`}
              className="group flex items-center gap-3 px-3 py-2 border rounded hover:bg-gray-50"
            >
              <input
                data-testid={`task-toggle-${task.id}`}
                type="checkbox"
                checked={task.status === WorkItemStatus.DONE}
                onChange={() => toggleStatus(task)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    task.status === WorkItemStatus.DONE ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{task.type}</span>
                  {task.points && (
                    <span className="text-xs text-blue-600 font-semibold">{task.points}pts</span>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

