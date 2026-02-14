/**
 * Phase 2H: Kanban Board Tab — Drag-and-drop with WIP enforcement
 *
 * Sources tasks from work_tasks via listTasks API.
 * Columns from BOARD_COLUMNS aligned with TaskStatus.
 * Drag card to column → PATCH task status + rank.
 * WIP limit badge on column header.
 * Guest: read-only, no drag. Member: drag if canEdit. Admin/Owner: full drag.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import {
  listTasks,
  updateTask,
  getWorkflowConfig,
  type WorkTask,
  type WorkTaskStatus,
  type EffectiveLimits,
} from '@/features/work-management/workTasks.api';
import { LayoutGrid, User, Calendar, AlertCircle, GripVertical, Shield } from 'lucide-react';
import { toast } from 'sonner';

/* ─── Column Config ─────────────────────────────────────────────────── */

const BOARD_COLUMNS: { status: WorkTaskStatus; label: string; color: string; bg: string; dropBg: string }[] = [
  { status: 'BACKLOG', label: 'Backlog', color: 'text-slate-600', bg: 'bg-slate-100', dropBg: 'bg-slate-200' },
  { status: 'TODO', label: 'To Do', color: 'text-blue-600', bg: 'bg-blue-50', dropBg: 'bg-blue-100' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-50', dropBg: 'bg-amber-100' },
  { status: 'IN_REVIEW', label: 'In Review', color: 'text-purple-600', bg: 'bg-purple-50', dropBg: 'bg-purple-100' },
  { status: 'DONE', label: 'Done', color: 'text-green-600', bg: 'bg-green-50', dropBg: 'bg-green-100' },
];

/* ─── Permission Helper ─────────────────────────────────────────────── */

function canDragTask(platformRole?: string): boolean {
  if (!platformRole) return false;
  const role = platformRole.toUpperCase();
  return role === 'ADMIN' || role === 'OWNER' || role === 'MEMBER';
}

/* ─── Board Component ───────────────────────────────────────────────── */

export const ProjectBoardTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const platformRole = user?.platformRole;
  const isDragAllowed = canDragTask(platformRole);

  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wipConfig, setWipConfig] = useState<EffectiveLimits | null>(null);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<WorkTaskStatus | null>(null);

  // WIP inline warnings
  const [wipWarning, setWipWarning] = useState<Record<string, string | null>>({});

  /* ── Load Data ─────────────────────────────────────────────────── */

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await listTasks({ projectId, limit: 200, sortBy: 'rank', sortDir: 'asc' });
      setTasks(result.items);
    } catch (err: any) {
      console.error('Board: failed to load tasks', err);
      setError(err?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadWipConfig = useCallback(async () => {
    if (!projectId) return;
    try {
      const config = await getWorkflowConfig(projectId);
      setWipConfig(config);
    } catch {
      // Non-critical — board works without WIP config
    }
  }, [projectId]);

  useEffect(() => {
    loadTasks();
    loadWipConfig();
  }, [loadTasks, loadWipConfig]);

  /* ── Drag Handlers ─────────────────────────────────────────────── */

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!isDragAllowed) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: WorkTaskStatus) => {
    if (!isDragAllowed) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStatus(status);
  };

  const handleDragLeave = () => {
    setDropTargetStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, toStatus: WorkTaskStatus) => {
    e.preventDefault();
    setDropTargetStatus(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === toStatus) {
      setDraggedTaskId(null);
      return;
    }

    // Compute new rank: place at end of target column
    const columnTasks = tasks.filter(t => t.status === toStatus && !t.deletedAt);
    const maxRank = columnTasks.reduce((max, t) => Math.max(max, t.rank ?? 0), 0);
    const newRank = maxRank + 1;

    // Optimistic update
    const previousTasks = [...tasks];
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, status: toStatus, rank: newRank } : t,
      ),
    );

    try {
      await updateTask(taskId, { status: toStatus as any, rank: newRank });
      toast.success(`Moved to ${BOARD_COLUMNS.find(c => c.status === toStatus)?.label ?? toStatus}`);
    } catch (err: any) {
      console.error('Board move failed:', err);
      const code = err?.code || err?.response?.data?.code;
      const msg = err?.message || err?.response?.data?.message || 'Failed to move task';

      if (code === 'WIP_LIMIT_EXCEEDED' || msg.includes('WIP limit exceeded')) {
        toast.error(msg);
        setWipWarning(prev => ({ ...prev, [toStatus]: 'WIP limit reached. Move blocked.' }));
        setTimeout(() => setWipWarning(prev => ({ ...prev, [toStatus]: null })), 4000);
      } else {
        toast.error(msg);
      }
      setTasks(previousTasks); // Rollback
    } finally {
      setDraggedTaskId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropTargetStatus(null);
  };

  /* ── Fallback status change (for non-drag environments / guests) ── */

  const handleStatusChange = async (taskId: string, newStatus: WorkTaskStatus) => {
    if (!isDragAllowed) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await updateTask(taskId, { status: newStatus as any });
      toast.success('Task status updated');
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      const msg = err?.message || err?.response?.data?.message || 'Failed to update status';
      if (code === 'WIP_LIMIT_EXCEEDED' || msg.includes('WIP limit exceeded')) {
        toast.error(msg);
        setWipWarning(prev => ({ ...prev, [newStatus]: 'WIP limit reached. Move blocked.' }));
        setTimeout(() => setWipWarning(prev => ({ ...prev, [newStatus]: null })), 3000);
      } else {
        toast.error(msg);
      }
      setTasks(previousTasks);
    }
  };

  /* ── Render states ─────────────────────────────────────────────── */

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

  const activeTasks = tasks.filter(t => !t.deletedAt);
  const grouped = BOARD_COLUMNS.map(col => ({
    ...col,
    tasks: activeTasks
      .filter(t => t.status === col.status)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    wipLimit: wipConfig?.derivedEffectiveLimit?.[col.status] ?? null,
  }));

  return (
    <div data-testid="board-root">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">Board</h2>
        <span className="text-sm text-slate-500 ml-2">{activeTasks.length} tasks</span>
        {!isDragAllowed && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded" data-testid="board-readonly-badge">
            <Shield className="h-3 w-3" /> Read-only
          </span>
        )}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[400px]">
        {grouped.map(col => {
          const isDropTarget = dropTargetStatus === col.status;
          const isOverWip = col.wipLimit !== null && col.tasks.length >= col.wipLimit;

          return (
            <div
              key={col.status}
              className={`rounded-lg p-3 transition-colors min-h-[300px] ${
                isDropTarget ? col.dropBg : col.bg
              } ${isDropTarget ? 'ring-2 ring-indigo-400' : ''}`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              data-testid={`board-column-${col.status}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.bg} ${col.color}`}>
                    {col.tasks.length}
                  </span>
                  {col.wipLimit !== null && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOverWip
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                      title={`WIP limit: ${col.wipLimit}`}
                      data-testid={`wip-badge-${col.status}`}
                    >
                      WIP {col.tasks.length}/{col.wipLimit}
                    </span>
                  )}
                </div>
              </div>

              {/* WIP Warning */}
              {wipWarning[col.status] && (
                <div
                  className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1"
                  data-testid="wip-warning"
                >
                  {wipWarning[col.status]}
                </div>
              )}

              {/* Cards */}
              <div className="space-y-2">
                {col.tasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No tasks</p>
                ) : (
                  col.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentStatus={col.status}
                      isDragging={draggedTaskId === task.id}
                      canDrag={isDragAllowed}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onStatusChange={isDragAllowed ? handleStatusChange : undefined}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Task Card ─────────────────────────────────────────────────────── */

const priorityColors: Record<string, string> = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-400',
  MEDIUM: 'border-l-yellow-400',
  LOW: 'border-l-slate-300',
};

const priorityLabels: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

interface TaskCardProps {
  task: WorkTask;
  currentStatus: WorkTaskStatus;
  isDragging: boolean;
  canDrag: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onStatusChange?: (taskId: string, status: WorkTaskStatus) => void;
}

function TaskCard({
  task,
  currentStatus,
  isDragging,
  canDrag,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: TaskCardProps) {
  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      className={`
        bg-white rounded-md border border-slate-200 p-3 transition-all border-l-4
        ${priorityColors[task.priority] || 'border-l-slate-200'}
        ${isDragging ? 'opacity-50 ring-2 ring-indigo-400 shadow-lg' : 'hover:shadow-sm'}
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
      `}
      data-testid="board-card"
      tabIndex={0}
      role="listitem"
      aria-label={`${task.title}, ${currentStatus}`}
    >
      {/* Drag handle + title */}
      <div className="flex items-start gap-2">
        {canDrag && (
          <GripVertical className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" data-testid="drag-handle" />
        )}
        <p className="text-sm font-medium text-slate-900 flex-1">{task.title}</p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
        {task.priority && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            task.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
            task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {priorityLabels[task.priority] ?? task.priority}
          </span>
        )}
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
        {task.estimatePoints != null && (
          <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-medium">
            {task.estimatePoints}pt
          </span>
        )}
        {task.estimateHours != null && (
          <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-xs font-medium">
            {task.estimateHours}h
          </span>
        )}
      </div>

      {/* Dropdown fallback for status change (visible for write users) */}
      {onStatusChange && (
        <div className="mt-2">
          <select
            value={currentStatus}
            onChange={(e) => onStatusChange(task.id, e.target.value as WorkTaskStatus)}
            className="w-full text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700"
            data-testid="status-select"
          >
            {BOARD_COLUMNS.map(col => (
              <option key={col.status} value={col.status}>{col.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default ProjectBoardTab;
