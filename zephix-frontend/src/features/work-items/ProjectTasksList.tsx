import { useEffect, useState, useRef } from 'react';
import { telemetry } from '@/lib/telemetry';
import { useWorkspaceStore } from '@/state/workspace.store';
import { toast } from 'sonner';
import {
  listTasks,
  updateTask,
  type WorkTask,
  type WorkTaskStatus,
} from '@/features/work-management/workTasks.api';
import { invalidateStatsCache } from '@/features/work-management/workTasks.stats.api';

// Error code constants
const ERR_WORKSPACE_REQUIRED = 'WORKSPACE_REQUIRED';

// Extract error details from API response
function getErrorDetails(error: any): { code?: string; message?: string } {
  const data = error?.response?.data || error;
  return {
    code: data?.code,
    message: data?.message || 'An error occurred',
  };
}

interface Props {
  projectId: string;
  workspaceId?: string;
}

export function ProjectTasksList({ projectId, workspaceId }: Props) {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // OPTIMISTIC: Rollback storage for failed toggle operations
  const rollbackTasks = useRef<Map<string, WorkTask>>(new Map());

  // FIX #6: Track in-flight toggles with state (not ref) so UI updates
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set());

  async function refresh(silent = false) {
    if (!silent) setLoading(true);
    try {
      const workspaceMismatch = !activeWorkspaceId || (workspaceId && activeWorkspaceId !== workspaceId);
      if (workspaceMismatch) {
        telemetry.track('task.workspace_mismatch', {
          projectId,
          workspaceId: workspaceId ?? null,
          activeWorkspaceId: activeWorkspaceId ?? null,
          workspaceMismatch,
        });
        throw Object.assign(new Error('Active workspace required'), { code: ERR_WORKSPACE_REQUIRED });
      }
      const params: { projectId: string; status?: WorkTaskStatus } = { projectId };
      if (statusFilter !== 'all') {
        params.status = (statusFilter === 'todo' ? 'TODO' : statusFilter === 'in_progress' ? 'IN_PROGRESS' : 'DONE') as WorkTaskStatus;
      }
      const result = await listTasks(params);
      setTasks(result.items || []);
    } catch (e: any) {
      console.error('Failed to load tasks', e);
      const { code } = getErrorDetails(e);
      if (code === ERR_WORKSPACE_REQUIRED && !silent) {
        toast.error('Workspace selection required');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [projectId, statusFilter]);

  async function toggleStatus(task: WorkTask) {
    // FIX #6: Prevent double-clicks using state-based tracking
    if (pendingToggleIds.has(task.id)) return;
    setPendingToggleIds(prev => new Set(prev).add(task.id));

    const newStatus: WorkTaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    const prevStatus = task.status;

    // OPTIMISTIC: Update UI immediately
    rollbackTasks.current.set(task.id, { ...task });
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
        : t
    ));

    try {
      const updated = await updateTask(task.id, { status: newStatus });
      telemetry.track('task.status_toggled', { taskId: task.id, status: newStatus });

      // Reconcile with server response (no full refresh needed)
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      rollbackTasks.current.delete(task.id);

      // Invalidate stats cache and emit event for KPI invalidation
      invalidateStatsCache(projectId);
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
    } catch (e: any) {
      telemetry.track('task.toggle.error', { taskId: task.id, error: (e as Error).message });

      // ROLLBACK: Restore previous state
      const rollback = rollbackTasks.current.get(task.id);
      if (rollback) {
        setTasks(prev => prev.map(t => t.id === task.id ? rollback : t));
        rollbackTasks.current.delete(task.id);
      }

      const { code, message } = getErrorDetails(e);
      if (code === ERR_WORKSPACE_REQUIRED) {
        toast.error('Workspace selection required');
      } else if (code === 'INVALID_STATUS_TRANSITION') {
        toast.error(`Cannot change from ${prevStatus} to ${newStatus}`);
      } else {
        toast.error(message || 'Failed to update task status');
      }
    } finally {
      setPendingToggleIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  const statusCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    in_progress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
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
                checked={task.status === 'DONE'}
                onChange={() => toggleStatus(task)}
                disabled={pendingToggleIds.has(task.id)}
                aria-busy={pendingToggleIds.has(task.id)}
                className={`w-4 h-4 rounded border-gray-300 ${
                  pendingToggleIds.has(task.id) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    task.status === 'DONE' ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </span>
                  <span className="text-xs text-gray-500 uppercase">{task.type}</span>
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

