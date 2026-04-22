/**
 * Phase 2H: Kanban Board Tab — Drag-and-drop with WIP enforcement
 *
 * Sources tasks from work_tasks via listTasks API.
 * Columns from BOARD_COLUMNS aligned with TaskStatus.
 * Drag card to column → PATCH task status + rank.
 * WIP limit badge on column header.
 * Guest: read-only, no drag. Member: drag if canEdit. Admin/Owner: full drag.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { platformRoleFromUser } from '@/utils/roles';
import {
  listTasks,
  updateTask,
  createTask,
  getWorkflowConfig,
  type WorkTask,
  type WorkTaskStatus,
  type EffectiveLimits,
} from '@/features/work-management/workTasks.api';
import { LayoutGrid, User, Calendar, AlertCircle, GripVertical, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { CompletionBar } from '@/features/work-management/components/CompletionBar';
import {
  computeProjectCompletionPercent,
  computeTaskCompletion,
} from '@/features/work-management/statusWeights';
import { filtersFromParams, taskMatchesFilters } from '@/features/projects/components/FilterBar';
import { WORK_SURFACE_QUERY } from '@/features/projects/workSurface/workSurfaceQuery';
import {
  parseSortDir,
  parseWorkSurfaceSortKey,
  sortWorkTasks,
} from '@/features/projects/workSurface/workSurfaceTaskSort';

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
  // VIEWER cannot drag; ADMIN and MEMBER can
  return platformRole === 'ADMIN' || platformRole === 'MEMBER';
}

/** Backend listTasks max page size (matches work-tasks MAX_LIMIT). */
const WORK_TASK_LIST_PAGE_SIZE = 200;

/* ─── Board Component ───────────────────────────────────────────────── */

export const ProjectBoardTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeWorkspaceId } = useWorkspaceStore();
  const { user } = useAuth();
  const isDragAllowed = canDragTask(platformRoleFromUser(user));

  const urlFilters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const taskQ = searchParams.get(WORK_SURFACE_QUERY.taskQ) ?? '';
  const myTasksOnly = searchParams.get(WORK_SURFACE_QUERY.myTasks) === '1';
  const sortKey = useMemo(
    () => parseWorkSurfaceSortKey(searchParams.get(WORK_SURFACE_QUERY.sort)),
    [searchParams],
  );
  const sortDir = useMemo(
    () => parseSortDir(searchParams.get(WORK_SURFACE_QUERY.sortDir)),
    [searchParams],
  );

  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [taskListMayBeIncomplete, setTaskListMayBeIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wipConfig, setWipConfig] = useState<EffectiveLimits | null>(null);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<WorkTaskStatus | null>(null);

  // WIP inline warnings
  const [wipWarning, setWipWarning] = useState<Record<string, string | null>>({});

  const [creatingInColumn, setCreatingInColumn] = useState<WorkTaskStatus | null>(null);
  const quickCreateSubmitLock = useRef(false);

  /* ── Load Data ─────────────────────────────────────────────────── */

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const result = await listTasks({
        projectId,
        limit: WORK_TASK_LIST_PAGE_SIZE,
        sortBy: 'rank',
        sortDir: 'asc',
      });
      setTasks(result.items);
      setTaskListMayBeIncomplete(result.total > result.items.length);
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

  const submitBoardQuickCreate = useCallback(
    async (status: WorkTaskStatus, rawTitle: string) => {
      const title = rawTitle.trim();
      if (!projectId || !title || quickCreateSubmitLock.current) return;
      quickCreateSubmitLock.current = true;
      try {
        await createTask({ projectId, title, status });
        await loadTasks();
        setCreatingInColumn(null);
      } catch (err: any) {
        console.error('Board quick create failed', err);
        toast.error(err?.response?.data?.message || err?.message || 'Failed to create task');
      } finally {
        quickCreateSubmitLock.current = false;
      }
    },
    [projectId, loadTasks],
  );

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

  /* ── Derived data (hooks MUST run before any early return) ───────── */

  const boardCompletionPercent = useMemo(
    () => computeProjectCompletionPercent(tasks.filter((t) => !t.deletedAt)),
    [tasks],
  );

  const subtaskStatusesByParent = useMemo(() => {
    const m = new Map<string, WorkTaskStatus[]>();
    for (const t of tasks) {
      if (t.deletedAt || !t.parentTaskId) continue;
      const arr = m.get(t.parentTaskId) ?? [];
      arr.push(t.status);
      m.set(t.parentTaskId, arr);
    }
    return m;
  }, [tasks]);

  const boardVisibleTasks = useMemo(() => {
    const active = tasks.filter((t) => !t.deletedAt && taskMatchesFilters(t, urlFilters));
    let list = active;
    if (myTasksOnly) {
      if (!user?.id) return [];
      list = list.filter((t) => t.assigneeUserId === user.id);
    }
    const q = taskQ.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.remarks ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [tasks, urlFilters, myTasksOnly, user?.id, taskQ]);

  const grouped = useMemo(() => {
    return BOARD_COLUMNS.map((col) => ({
      ...col,
      tasks: sortWorkTasks(
        boardVisibleTasks.filter((t) => t.status === col.status),
        sortKey,
        sortDir,
      ),
      wipLimit: wipConfig?.derivedEffectiveLimit?.[col.status] ?? null,
    }));
  }, [boardVisibleTasks, wipConfig, sortKey, sortDir]);

  const activeTaskCount = useMemo(() => boardVisibleTasks.length, [boardVisibleTasks]);

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

  return (
    <div data-testid="board-root">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Board</h2>
          <span className="text-sm text-slate-500">{activeTaskCount} tasks</span>
          {!isDragAllowed && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded" data-testid="board-readonly-badge">
              <Shield className="h-3 w-3" /> Read-only
            </span>
          )}
        </div>
        <div className="shrink-0" data-testid="board-project-completion">
          <CompletionBar percent={boardCompletionPercent} size="md" />
        </div>
      </div>

      {taskListMayBeIncomplete && (
        <div
          className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800"
          data-testid="board-task-limit-banner"
        >
          Showing first {WORK_TASK_LIST_PAGE_SIZE} tasks. Some tasks may not be visible.
        </div>
      )}

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
                      projectId={projectId!}
                      task={task}
                      childStatuses={subtaskStatusesByParent.get(task.id)}
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

              {isDragAllowed && (
                <div className="mt-2 px-2 pb-2">
                  {creatingInColumn === col.status ? (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Task title…"
                      disabled={loading}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                      data-testid={`board-quick-create-${col.status}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setCreatingInColumn(null);
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submitBoardQuickCreate(col.status, e.currentTarget.value);
                        }
                      }}
                      onBlur={(e) => {
                        if (quickCreateSubmitLock.current) {
                          setCreatingInColumn(null);
                          return;
                        }
                        const v = e.currentTarget.value.trim();
                        if (v) {
                          void submitBoardQuickCreate(col.status, v);
                        } else {
                          setCreatingInColumn(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreatingInColumn(col.status)}
                      className="w-full rounded px-2 py-1 text-left text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      data-testid={`board-add-task-${col.status}`}
                    >
                      + Add task
                    </button>
                  )}
                </div>
              )}
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
  projectId: string;
  task: WorkTask;
  /** Subtask statuses for completion rollup (optional). */
  childStatuses?: WorkTaskStatus[];
  currentStatus: WorkTaskStatus;
  isDragging: boolean;
  canDrag: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onStatusChange?: (taskId: string, status: WorkTaskStatus) => void;
}

function TaskCard({
  projectId,
  task,
  childStatuses,
  currentStatus,
  isDragging,
  canDrag,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: TaskCardProps) {
  const navigate = useNavigate();
  const cardCompletion = computeTaskCompletion(
    task.status,
    childStatuses && childStatuses.length > 0 ? childStatuses : undefined,
  );

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
        <button
          type="button"
          className="text-sm font-medium text-slate-900 flex-1 text-left hover:text-indigo-600 transition-colors"
          onClick={(e) => { e.stopPropagation(); navigate(`/projects/${projectId}/table?task=${task.id}`); }}
        >
          {task.title}
        </button>
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

      <div className="mt-2" data-testid={`board-card-completion-${task.id}`}>
        <CompletionBar percent={cardCompletion} />
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
