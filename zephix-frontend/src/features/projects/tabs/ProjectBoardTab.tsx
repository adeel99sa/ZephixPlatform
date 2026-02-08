/**
 * Wave 1: Kanban Board Tab
 *
 * Groups tasks by status into columns: Backlog, To Do, In Progress, In Review, Done.
 * Click to change status. No drag-and-drop in v1.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listTasks, updateTask, type WorkTask, type WorkTaskStatus } from '@/features/work-management/workTasks.api';
import { LayoutGrid, User, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BOARD_COLUMNS: { status: WorkTaskStatus; label: string; color: string; bg: string }[] = [
  { status: 'BACKLOG', label: 'Backlog', color: 'text-slate-600', bg: 'bg-slate-100' },
  { status: 'TODO', label: 'To Do', color: 'text-blue-600', bg: 'bg-blue-50' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-50' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'text-purple-600', bg: 'bg-purple-50' },
  { status: 'DONE', label: 'Done', color: 'text-green-600', bg: 'bg-green-50' },
];

export const ProjectBoardTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await listTasks({ projectId, limit: 200 });
      setTasks(result.items);
    } catch (err: any) {
      console.error('Board: failed to load tasks', err);
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Tracks per-column inline WIP warning messages
  const [wipWarning, setWipWarning] = useState<Record<string, string | null>>({});

  const handleStatusChange = async (taskId: string, newStatus: WorkTaskStatus) => {
    // Optimistic update
    const previousTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await updateTask(taskId, { status: newStatus });
      toast.success('Task status updated');
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      // Detect WIP_LIMIT_EXCEEDED from backend error
      const code = err?.code || err?.response?.data?.code;
      const msg = err?.message || err?.response?.data?.message || 'Failed to update status';
      if (code === 'WIP_LIMIT_EXCEEDED' || msg.includes('WIP limit exceeded')) {
        toast.error(msg);
        // Inline column warning
        setWipWarning(prev => ({ ...prev, [newStatus]: 'WIP limit reached. Move blocked.' }));
        setTimeout(() => setWipWarning(prev => ({ ...prev, [newStatus]: null })), 3000);
      } else {
        toast.error(msg);
      }
      setTasks(previousTasks); // Rollback
    }
  };

  if (!projectId || !activeWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <p>Select a workspace and project to view the board.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="board-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="board-error">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Error loading board</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={loadTasks} className="mt-2 text-sm text-red-700 underline">Retry</button>
        </div>
      </div>
    );
  }

  const grouped = BOARD_COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.status && !t.deletedAt),
  }));

  return (
    <div data-testid="board-root">
      <div className="mb-4 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Board</h2>
        <span className="text-sm text-slate-500 ml-2">{tasks.filter(t => !t.deletedAt).length} tasks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[400px]">
        {grouped.map(col => (
          <div key={col.status} className={`rounded-lg p-3 ${col.bg} min-h-[300px]`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.bg} ${col.color}`}>
                {col.tasks.length}
              </span>
            </div>
            {wipWarning[col.status] && (
              <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1" data-testid="wip-warning">
                {wipWarning[col.status]}
              </div>
            )}
            <div className="space-y-2">
              {col.tasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No tasks</p>
              ) : (
                col.tasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentStatus={col.status}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function TaskCard({
  task,
  currentStatus,
  onStatusChange,
}: {
  task: WorkTask;
  currentStatus: WorkTaskStatus;
  onStatusChange: (taskId: string, status: WorkTaskStatus) => void;
}) {
  const priorityColors: Record<string, string> = {
    CRITICAL: 'border-l-red-500',
    HIGH: 'border-l-orange-400',
    MEDIUM: 'border-l-yellow-400',
    LOW: 'border-l-slate-300',
  };

  return (
    <div
      className={`bg-white rounded-md border border-slate-200 p-3 hover:shadow-sm transition-shadow border-l-4 ${priorityColors[task.priority] || 'border-l-slate-200'}`}
      data-testid="board-card"
    >
      <p className="text-sm font-medium text-slate-900 mb-2">{task.title}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {task.assigneeUserId && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Assigned
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
      {/* Quick status change */}
      <div className="mt-2">
        <select
          value={currentStatus}
          onChange={(e) => onStatusChange(task.id, e.target.value as WorkTaskStatus)}
          className="w-full text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700"
        >
          {BOARD_COLUMNS.map(col => (
            <option key={col.status} value={col.status}>{col.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default ProjectBoardTab;
