// ─────────────────────────────────────────────────────────────────────────────
// Work Item Detail Panel — Phase 4.4
//
// Sliding right panel. Tabbed detail view.
// Shows task + comments + deps + docs + risks + changes + activity.
// Integrates cmd+K actions for task context.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Loader2,
  MessageSquare,
  FileText,
  AlertTriangle,
  GitBranch,
  Activity,
  Clock,
  Send,
  Upload,
  CheckCircle2,
  Circle,
  ArrowRight,
  Zap,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getTaskDetail,
  addComment,
  uploadDocumentForTask,
  moveTask as moveTaskApi,
  type TaskDetailDto,
  type TaskLifecycle,
} from '../api/taskDetail.api';
import {
  calculateScheduleInfo,
  SCHEDULE_STATUS_CONFIG,
  type ScheduleStatus,
} from '../utils/schedule-variance';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';
import { apiClient } from '@/lib/api/client';
import { ExplanationBanner, useExplanations } from '@/features/explanations';
import type { ExplanationContext } from '@/features/explanations';
import { intentColors } from '@/design/tokens';
import { typography } from '@/design/typography';
import { trackBeta } from '@/lib/telemetry';
import {
  createTask as createSubtask,
  updateTask as updateTaskApi,
  updateComment as updateCommentApi,
  deleteComment as deleteCommentApi,
  addDependency as addDependencyApi,
  removeDependency as removeDependencyApi,
  listTasks,
  type WorkTask as WorkTaskItem,
  type DependencyType,
  type CreateTaskInput,
} from '../workTasks.api';
import { useAuth } from '@/state/AuthContext';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
  taskId: string;
  workspaceId: string;
  projectId: string;
  onClose: () => void;
}

type TabId =
  | 'overview'
  | 'comments'
  | 'documents'
  | 'dependencies'
  | 'activity'
  | 'links';

interface ResolvedAction {
  id: string;
  label: string;
  description?: string;
  group: string;
  disabled: { isDisabled: boolean; reason?: string };
  apiCall?: { method: string; pathTemplate: string; bodyTemplate?: any };
  deepLink?: string;
  confirm: { required: boolean; message?: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: intentColors.neutral.badge,
  TODO: intentColors.info.badge,
  IN_PROGRESS: intentColors.warning.badge,
  BLOCKED: intentColors.danger.badge,
  IN_REVIEW: intentColors.info.badge,
  DONE: intentColors.success.badge,
  CANCELED: intentColors.neutral.badge,
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
};

// ── Step 13: Lifecycle badge colors ────────────────────────────────────────

const LIFECYCLE_BADGE: Record<string, { bg: string; label: string }> = {
  PLANNED: { bg: intentColors.neutral.badge, label: 'Planned' },
  IN_PROGRESS: { bg: intentColors.info.badge, label: 'In Progress' },
  BLOCKED: { bg: intentColors.danger.badge, label: 'Blocked' },
  COMPLETED: { bg: intentColors.success.badge, label: 'Completed' },
  CANCELLED: { bg: intentColors.neutral.badge, label: 'Cancelled' },
};

/**
 * Detect lifecycle vs. status mismatch.
 * E.g. status = IN_PROGRESS but lifecycle = BLOCKED because of dependencies.
 */
function detectLifecycleMismatch(
  status: string,
  lifecycle: TaskLifecycle | undefined,
): string | null {
  if (!lifecycle) return null;
  // Status says IN_PROGRESS but lifecycle says BLOCKED
  if (status === 'IN_PROGRESS' && lifecycle === 'BLOCKED') {
    return 'Task status is In Progress but it is blocked by dependencies or a blocker reason.';
  }
  // Status says DONE but lifecycle isn't COMPLETED (missing actualEndDate)
  if (status === 'DONE' && lifecycle !== 'COMPLETED' && lifecycle !== 'CANCELLED') {
    return 'Task is marked Done but missing an actual end date — lifecycle not completed.';
  }
  return null;
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(d?: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Step 27: Relative time for comment thread (e.g. "2 hours ago", "3 days ago") */
function formatRelativeTime(d?: string | null): string {
  if (!d) return '';
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatTime(d);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorkItemDetailPanel({
  taskId,
  workspaceId,
  projectId,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<TaskDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [actions, setActions] = useState<ResolvedAction[]>([]);

  // Comments
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Move
  const [showMove, setShowMove] = useState(false);
  const [moveStatus, setMoveStatus] = useState('');
  const [moving, setMoving] = useState(false);

  // Sprint 2: Subtasks
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  // Sprint 2: Comment edit/delete
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');

  const { user } = useAuth();
  const { canEditWork } = useWorkspacePermissions();

  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Data loading ────────────────────────────────────────────────────

  const loadDetail = useCallback(async () => {
    try {
      const data = await getTaskDetail(workspaceId, taskId);
      setDetail(data);
    } catch {
      toast.error('Task not found');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [workspaceId, taskId, onClose]);

  const loadActions = useCallback(async () => {
    try {
      const res = await apiClient.post('/commands/resolve', {
        organizationId: '', // auto from token
        workspaceId,
        route: { pathname: `/projects/${projectId}/tasks/${taskId}` },
        entityContext: { projectId, taskId },
      });
      const data: any = (res as any)?.data?.data ?? (res as any)?.data ?? {};
      const all = [
        ...(Array.isArray(data.actions) ? data.actions : []),
        ...(Array.isArray(data.suggestedTemplates) ? data.suggestedTemplates : []),
      ];
      setActions(all);
    } catch {
      // Silent — actions optional
    }
  }, [workspaceId, projectId, taskId]);

  useEffect(() => {
    void loadDetail();
    void loadActions();
  }, [loadDetail, loadActions]);

  // Auto-scroll to newest comment when comments change (Step 27)
  useEffect(() => {
    if (activeTab === 'comments' && commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [detail?.comments?.length, activeTab]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ─── Handlers ────────────────────────────────────────────────────────

  // Comment auto-scroll ref (Step 27)
  const commentEndRef = useRef<HTMLDivElement>(null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await addComment(workspaceId, taskId, newComment.trim());
      setNewComment('');
      trackBeta('USER_POSTED_COMMENT', workspaceId, { taskId });
      await loadDetail();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setPosting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadDocumentForTask(workspaceId, projectId, taskId, file);
      toast.success('Document uploaded');
      await loadDetail();
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleMoveTask = async (confirmScheduleWarnings?: boolean) => {
    if (!moveStatus) return;
    setMoving(true);
    try {
      await moveTaskApi(workspaceId, taskId, {
        targetStatus: moveStatus,
        confirmWarnings: confirmScheduleWarnings,
      });
      toast.success('Task moved');
      setShowMove(false);
      await loadDetail();
      await loadActions();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'WIP_LIMIT_EXCEEDED') {
        toast.error(err?.response?.data?.message || 'WIP limit exceeded');
      } else if (code === 'SCHEDULE_WARNINGS_CONFIRM_REQUIRED' && !confirmScheduleWarnings) {
        // Step 15: Schedule SOFT enforcement — ask user to confirm
        const warnings = err?.response?.data?.warnings ?? [];
        const msg = warnings.length > 0
          ? warnings.join('\n')
          : 'Schedule warnings present.';
        if (window.confirm(`Schedule Warning:\n\n${msg}\n\nProceed anyway?`)) {
          setMoving(false);
          handleMoveTask(true);
          return;
        }
        toast.error('Task move cancelled due to schedule warnings');
      } else if (code === 'SCHEDULE_COMPLETION_BLOCKED') {
        toast.error(err?.response?.data?.message || 'Completion blocked by schedule policy');
      } else {
        toast.error(
          err?.response?.data?.message || 'Failed to move task',
        );
      }
    } finally {
      setMoving(false);
    }
  };

  // Sprint 2: Create subtask
  const handleCreateSubtask = async () => {
    if (!newSubtaskTitle.trim() || !detail) return;
    setCreatingSubtask(true);
    try {
      const input: CreateTaskInput = {
        projectId: detail.task.projectId,
        title: newSubtaskTitle.trim(),
      };
      await createSubtask(input);
      setNewSubtaskTitle('');
      toast.success('Subtask created');
      await loadDetail();
    } catch {
      toast.error('Failed to create subtask');
    } finally {
      setCreatingSubtask(false);
    }
  };

  // Sprint 2: Toggle subtask status (DONE ↔ TODO)
  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    const newStatus = (currentStatus === 'DONE') ? 'TODO' : 'DONE';
    // Optimistic update
    if (detail) {
      setDetail({
        ...detail,
        subtasks: detail.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, status: newStatus } : s,
        ),
        subtaskDoneCount: detail.subtaskDoneCount + (newStatus === 'DONE' ? 1 : -1),
      });
    }
    try {
      await updateTaskApi(subtaskId, { status: newStatus as any });
    } catch {
      toast.error('Failed to update subtask');
      await loadDetail(); // rollback
    }
  };

  // Sprint 2: Comment edit
  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentBody.trim()) return;
    try {
      await updateCommentApi(taskId, commentId, editCommentBody.trim());
      setEditingCommentId(null);
      setEditCommentBody('');
      await loadDetail();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'COMMENT_EDIT_DENIED') {
        toast.error('You can only edit your own comments');
      } else {
        toast.error('Failed to edit comment');
      }
    }
  };

  // Sprint 2: Comment delete
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteCommentApi(taskId, commentId);
      toast.success('Comment deleted');
      await loadDetail();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'COMMENT_DELETE_DENIED') {
        toast.error('You can only delete your own comments');
      } else {
        toast.error('Failed to delete comment');
      }
    }
  };

  // Sprint 2: Dependencies — add dependency
  const [showAddDep, setShowAddDep] = useState(false);
  const [depSearch, setDepSearch] = useState('');
  const [depSearchResults, setDepSearchResults] = useState<WorkTaskItem[]>([]);
  const [depType, setDepType] = useState<DependencyType>('FINISH_TO_START');
  const [addingDep, setAddingDep] = useState(false);

  // Debounced search for dependency tasks
  useEffect(() => {
    if (!showAddDep || !depSearch.trim() || !detail) return;
    const timer = setTimeout(async () => {
      try {
        const result = await listTasks({
          projectId: detail.task.projectId,
          search: depSearch.trim(),
          limit: 10,
        });
        // Exclude current task and already linked tasks
        const existingIds = new Set([
          taskId,
          ...detail.dependencies.blockedBy.map((d) => d.predecessorTaskId),
          ...detail.dependencies.blocking.map((d) => d.successorTaskId),
        ]);
        setDepSearchResults((result.items || []).filter((t) => !existingIds.has(t.id)));
      } catch {
        setDepSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [depSearch, showAddDep, detail, taskId]);

  const handleAddDependency = async (predecessorId: string) => {
    setAddingDep(true);
    try {
      await addDependencyApi(taskId, predecessorId, depType);
      toast.success('Dependency added');
      setShowAddDep(false);
      setDepSearch('');
      setDepSearchResults([]);
      await loadDetail();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add dependency';
      toast.error(msg);
    } finally {
      setAddingDep(false);
    }
  };

  const handleRemoveDependency = async (predecessorId: string, type?: DependencyType) => {
    if (!confirm('Remove this dependency?')) return;
    try {
      await removeDependencyApi(taskId, predecessorId, type);
      toast.success('Dependency removed');
      await loadDetail();
    } catch {
      toast.error('Failed to remove dependency');
    }
  };

  const handleSaveAC = async (
    items: Array<{ text: string; done: boolean }>,
  ) => {
    try {
      await apiClient.patch(
        `/work/tasks/${taskId}`,
        { acceptanceCriteria: items },
        { headers: { 'x-workspace-id': workspaceId } },
      );
    } catch {
      toast.error('Failed to save acceptance criteria');
      throw new Error('save failed');
    }
  };

  // ─── Explanation context ──────────────────────────────────────────────

  const explanationCtx = useMemo<ExplanationContext | null>(() => {
    if (!detail) return null;
    return {
      task: {
        id: detail.task.id,
        status: detail.task.status,
        lifecycle: detail.lifecycle,
        blockedReason: detail.task.blockedReason,
        isBlockedByDependencies: detail.isBlockedByDependencies,
        blockingTaskCount: detail.blockingTaskCount,
        dueDate: detail.task.dueDate,
        completedAt: detail.task.completedAt,
      },
      schedule: detail.schedule ? {
        status: detail.schedule.status,
        endVarianceDays: detail.schedule.endVarianceDays,
        startVarianceDays: detail.schedule.startVarianceDays,
        forecastEndDate: detail.schedule.forecastEndDate,
      } : undefined,
    };
  }, [detail]);

  const explanations = useExplanations(explanationCtx);

  // Step 24: Track blocked action encounters (once per detail load)
  useEffect(() => {
    if (detail?.isBlockedByDependencies) {
      trackBeta('USER_TRIGGERED_BLOCKED_ACTION', workspaceId, {
        taskId,
        blockingCount: detail.blockingTaskCount,
      });
    }
  }, [detail?.isBlockedByDependencies, taskId, workspaceId]);

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l shadow-xl z-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!detail) return null;

  const { task } = detail;

  const depsCount =
    detail.dependencies.blockedBy.length + detail.dependencies.blocking.length;
  const linksCount = detail.risks.length + detail.changeRequests.length;

  const tabs: Array<{ id: TabId; label: string; icon: any; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: Circle },
    {
      id: 'comments',
      label: 'Comments',
      icon: MessageSquare,
      count: detail.comments.length,
    },
    {
      id: 'documents',
      label: 'Docs',
      icon: FileText,
      count: detail.documents.length,
    },
    {
      id: 'dependencies',
      label: 'Dependencies',
      icon: GitBranch,
      count: depsCount,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: Activity,
      count: detail.activity.length,
    },
    {
      id: 'links',
      label: 'Links',
      icon: AlertTriangle,
      count: linksCount,
    },
  ];

  // Task-scoped actions
  const taskActions = actions.filter(
    (a) =>
      a.id === 'OPEN_TASK_DETAIL' ||
      a.id === 'MOVE_TASK' ||
      a.id === 'ARCHIVE_TASK',
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Panel — slide in from right */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right"
        data-testid="work-item-detail-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100'}`}
            >
              {task.status.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] || ''}`}
            >
              {task.priority}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200"
            data-testid="detail-panel-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions bar */}
        {taskActions.length > 0 && (
          <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-2 flex-wrap">
            <Zap className="h-3.5 w-3.5 text-indigo-500" />
            {taskActions.map((action) => {
              // Step 23: Upstream blocked — ghost out move action
              const isUpstreamBlocked =
                action.id === 'MOVE_TASK' && detail.isBlockedByDependencies;

              if (isUpstreamBlocked) {
                return (
                  <span
                    key={action.id}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${typography.muted} border border-slate-100 bg-transparent cursor-not-allowed`}
                    title={`Blocked by ${detail.blockingTaskCount} upstream dependency${detail.blockingTaskCount !== 1 ? 'ies' : 'y'}`}
                    data-testid="upstream-blocked-indicator"
                  >
                    Upstream Blocked
                  </span>
                );
              }

              return (
                <button
                  key={action.id}
                  disabled={action.disabled.isDisabled}
                  title={action.disabled.reason}
                  onClick={() => {
                    if (action.id === 'MOVE_TASK') {
                      setShowMove(true);
                    } else if (action.deepLink) {
                      window.location.href = action.deepLink;
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-white border hover:bg-gray-50 disabled:opacity-40"
                >
                  {action.label.replace(/^(Open task|Move task|Archive task):.*/, (m) =>
                    m.includes(':') ? m.split(':')[0] : m,
                  )}
                  <ChevronRight className="h-3 w-3" />
                </button>
              );
            })}
            {/* Step 23: Navigation hint when upstream blocked */}
            {detail.isBlockedByDependencies && (
              <button
                onClick={() => setActiveTab('dependencies')}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                data-testid="view-blocking-deps"
              >
                View dependencies
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Move modal */}
        {showMove && (
          <div className="px-4 py-3 border-b bg-blue-50">
            <div className="text-sm font-medium text-blue-900 mb-2">
              Move Task
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={moveStatus}
                onChange={(e) => setMoveStatus(e.target.value)}
                className="flex-1 rounded border px-2 py-1 text-sm"
              >
                <option value="">Select status...</option>
                {['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW', 'DONE'].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ),
                )}
              </select>
              <button
                onClick={() => handleMoveTask()}
                disabled={moving || !moveStatus}
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {moving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowRight className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => setShowMove(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`detail-tab-${tab.id}`}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className="ml-0.5 text-[10px] text-gray-400">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* ─── Overview ──────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="p-4 space-y-5">
              {/* Step 13: Lifecycle badge (system-owned) */}
              {detail.lifecycle && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Lifecycle</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      LIFECYCLE_BADGE[detail.lifecycle]?.bg || 'bg-gray-100 text-gray-700'
                    }`}
                    data-testid="lifecycle-badge"
                  >
                    {LIFECYCLE_BADGE[detail.lifecycle]?.label || detail.lifecycle}
                  </span>
                  {detail.lifecycle === 'BLOCKED' && (
                    <span className="text-xs text-red-600">
                      {detail.isBlockedByDependencies
                        ? `${detail.blockingTaskCount} blocking dep${detail.blockingTaskCount !== 1 ? 's' : ''}`
                        : ''}
                      {detail.isBlockedByDependencies && task.blockedReason ? ' · ' : ''}
                      {task.blockedReason || ''}
                    </span>
                  )}
                </div>
              )}

              {/* Step 13: Lifecycle mismatch warning */}
              {(() => {
                const mismatch = detectLifecycleMismatch(task.status, detail.lifecycle);
                if (!mismatch) return null;
                return (
                  <div
                    className={`flex items-start gap-2 rounded-lg border ${intentColors.warning.border} ${intentColors.warning.bg} p-3`}
                    data-testid="lifecycle-mismatch-warning"
                  >
                    <AlertTriangle className={`h-4 w-4 ${intentColors.warning.text} mt-0.5 shrink-0`} />
                    <p className="text-xs text-amber-800">{mismatch}</p>
                  </div>
                );
              })()}

              {/* Explanation banner */}
              <ExplanationBanner explanations={explanations} className="mb-4" />

              {/* Meta fields — primary work info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className={typography.muted + ' block'}>Type</span>
                  <span className="font-medium text-slate-900">{task.type || 'TASK'}</span>
                </div>
                <div>
                  <span className={typography.muted + ' block'}>Due</span>
                  <span className="font-medium text-slate-900">{formatDate(task.dueDate)}</span>
                </div>
                <div>
                  <span className={typography.muted + ' block'}>Start</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(task.startDate)}
                  </span>
                </div>
              </div>

              {/* Meta fields — system / secondary (demoted) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className={typography.muted + ' block'}>Created</span>
                  <span className={typography.muted}>
                    {formatDate(task.createdAt)}
                  </span>
                </div>
                {task.actualStartDate && (
                  <div>
                    <span className={typography.muted + ' block'}>Actual Start</span>
                    <span className={typography.muted}>{formatDate(task.actualStartDate)}</span>
                  </div>
                )}
                {task.actualEndDate && (
                  <div>
                    <span className={typography.muted + ' block'}>Actual End</span>
                    <span className={typography.muted}>{formatDate(task.actualEndDate)}</span>
                  </div>
                )}
                {task.sprintId && (
                  <div>
                    <span className={typography.muted + ' block'}>Sprint</span>
                    <span className={typography.muted}>Active</span>
                  </div>
                )}
                {task.phaseId && (
                  <div>
                    <span className={typography.muted + ' block'}>Phase</span>
                    <span className={typography.muted}>Assigned</span>
                  </div>
                )}
              </div>

              {/* Estimation section */}
              {(task.estimatePoints != null || task.estimateHours != null || task.actualHours != null || task.remainingHours != null) && (
                <div className="border-t pt-3 mt-3 space-y-1">
                  <span className={typography.muted + ' block text-xs font-semibold uppercase'}>Estimates</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {task.estimatePoints != null && (
                      <div>
                        <span className={typography.muted + ' block'}>Points</span>
                        <span className="font-medium">{task.estimatePoints}</span>
                      </div>
                    )}
                    {task.estimateHours != null && (
                      <div>
                        <span className={typography.muted + ' block'}>Est. Hours</span>
                        <span className="font-medium">{task.estimateHours}h</span>
                      </div>
                    )}
                    {task.remainingHours != null && (
                      <div>
                        <span className={typography.muted + ' block'}>Remaining</span>
                        <span className="font-medium">{task.remainingHours}h</span>
                      </div>
                    )}
                    {task.actualHours != null && (
                      <div>
                        <span className={typography.muted + ' block'}>Actual</span>
                        <span className="font-medium">{task.actualHours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 14: Schedule variance section */}
              {(() => {
                const sched = detail.schedule
                  ? {
                      plannedDurationDays: detail.schedule.plannedDurationDays,
                      actualDurationDays: detail.schedule.actualDurationDays,
                      startVarianceDays: detail.schedule.startVarianceDays,
                      endVarianceDays: detail.schedule.endVarianceDays,
                      forecastEndDate: detail.schedule.forecastEndDate,
                      status: detail.schedule.status as ScheduleStatus,
                    }
                  : calculateScheduleInfo({
                      startDate: task.startDate ?? null,
                      dueDate: task.dueDate ?? null,
                      actualStartDate: task.actualStartDate ?? null,
                      actualEndDate: task.actualEndDate ?? null,
                    });
                const cfg = SCHEDULE_STATUS_CONFIG[sched.status] ?? SCHEDULE_STATUS_CONFIG.AT_RISK;
                const hasData = sched.plannedDurationDays != null || sched.actualDurationDays != null;
                if (!hasData) return null;
                return (
                  <div className="rounded-lg border p-3 space-y-2" data-testid="schedule-section">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase">Schedule</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {task.startDate && (
                        <div>
                          <span className="text-gray-400 block">Planned</span>
                          <span className="font-medium">
                            {formatDate(task.startDate)} → {formatDate(task.dueDate)}
                          </span>
                        </div>
                      )}
                      {task.actualStartDate && (
                        <div>
                          <span className="text-gray-400 block">Actual</span>
                          <span className="font-medium">
                            {formatDate(task.actualStartDate)}
                            {task.actualEndDate
                              ? ` → ${formatDate(task.actualEndDate)}`
                              : sched.forecastEndDate
                                ? ` → ~${formatDate(sched.forecastEndDate)}`
                                : ' → in progress'}
                          </span>
                        </div>
                      )}
                      {sched.endVarianceDays != null && (
                        <div>
                          <span className="text-gray-400 block">Variance</span>
                          <span className={`font-medium ${sched.endVarianceDays > 0 ? 'text-red-600' : sched.endVarianceDays < 0 ? 'text-green-600' : ''}`}>
                            {sched.endVarianceDays > 0 ? '+' : ''}{sched.endVarianceDays}d
                          </span>
                        </div>
                      )}
                      {sched.plannedDurationDays != null && (
                        <div>
                          <span className="text-gray-400 block">Duration</span>
                          <span className="font-medium">
                            {sched.plannedDurationDays}d planned
                            {sched.actualDurationDays != null ? ` / ${sched.actualDurationDays}d actual` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Dependencies quick summary */}
              {depsCount > 0 && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Dependencies
                  </h4>
                  {detail.dependencies.blockedBy.length > 0 && (
                    <p className="text-xs text-red-600">
                      Blocked by {detail.dependencies.blockedBy.length} task(s)
                    </p>
                  )}
                  {detail.dependencies.blocking.length > 0 && (
                    <p className="text-xs text-orange-600">
                      Blocking {detail.dependencies.blocking.length} task(s)
                    </p>
                  )}
                </div>
              )}

              {/* Acceptance criteria */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Acceptance Criteria
                </h4>
                <AcceptanceCriteriaEditor
                  items={task.acceptanceCriteria || []}
                  onSave={handleSaveAC}
                />
              </div>

              {/* Sprint 2: Subtasks section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">
                    Subtasks
                    {detail.subtaskCount > 0 && (
                      <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                        {detail.subtaskDoneCount} of {detail.subtaskCount} complete
                      </span>
                    )}
                  </h4>
                </div>

                {/* Progress bar */}
                {detail.subtaskCount > 0 && (
                  <div className="mb-3">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((detail.subtaskDoneCount / detail.subtaskCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtask list */}
                <div className="space-y-1">
                  {(detail.subtasks || []).map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50"
                    >
                      {/* Status toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleSubtask(sub.id, sub.status); }}
                        disabled={!canEditWork}
                        className="shrink-0"
                      >
                        {sub.status === 'DONE' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />
                        )}
                      </button>
                      {/* Title — click opens subtask */}
                      <span
                        className={`text-sm flex-1 truncate cursor-pointer hover:text-indigo-600 ${sub.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700'}`}
                        onClick={() => {
                          // Navigate to subtask in the same panel by updating the taskId
                          // The parent component controls taskId, so we use onClose + reopen pattern
                          // For now, just display a toast with the subtask ID for deep linking
                          onClose();
                          // The parent will handle re-opening with the new taskId
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: sub.id } }));
                          }, 100);
                        }}
                      >
                        {sub.title}
                      </span>
                      {/* Due date */}
                      {sub.dueDate && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {new Date(sub.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Inline create subtask */}
                {canEditWork && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateSubtask();
                        if (e.key === 'Escape') setNewSubtaskTitle('');
                      }}
                      placeholder="Add subtask..."
                      className="flex-1 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                    />
                    {newSubtaskTitle.trim() && (
                      <button
                        onClick={handleCreateSubtask}
                        disabled={creatingSubtask}
                        className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {creatingSubtask ? 'Adding...' : 'Add'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Comments (Step 27 — hardened thread UI) ────────── */}
          {activeTab === 'comments' && (
            <div className="flex flex-col h-full">
              {/* Thread area */}
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
                {detail.comments.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-8 w-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm text-neutral-500">No comments yet</p>
                    <p className="text-xs text-neutral-400 mt-1">Start a conversation about this task</p>
                  </div>
                ) : (
                  // Render oldest first for natural thread reading
                  [...detail.comments].reverse().map((c) => {
                    const author = detail.commentAuthors?.[c.createdByUserId];
                    const authorName = author
                      ? (author.firstName && author.lastName
                          ? `${author.firstName} ${author.lastName}`
                          : author.email)
                      : c.createdByUserId.slice(0, 8) + '...';
                    const initials = author
                      ? (author.firstName && author.lastName
                          ? `${author.firstName[0]}${author.lastName[0]}`
                          : author.email.slice(0, 2))
                      : c.createdByUserId.slice(0, 2);

                    const isOwnComment = c.createdByUserId === user?.id;
                    const canModerate = user?.role === 'ADMIN' || user?.role === 'admin';
                    const canEditComment = isOwnComment || canModerate;
                    const isEditingThis = editingCommentId === c.id;

                    return (
                      <div
                        key={c.id}
                        className="group relative"
                        data-testid={`comment-${c.id}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Author avatar */}
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                            {initials.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-neutral-700 truncate">
                                {authorName}
                              </span>
                              <span className="text-[10px] text-neutral-400" title={new Date(c.createdAt).toLocaleString()}>
                                {formatRelativeTime(c.createdAt)}
                              </span>
                              {c.updatedAt !== c.createdAt && (
                                <span className="text-[10px] text-neutral-400 italic">(edited)</span>
                              )}
                              {/* Sprint 2: Edit/delete actions */}
                              {canEditComment && !isEditingThis && (
                                <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                                    className="p-0.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                                    title="Edit comment"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="p-0.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500"
                                    title="Delete comment"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </span>
                              )}
                            </div>
                            {isEditingThis ? (
                              <div className="space-y-1.5">
                                <textarea
                                  value={editCommentBody}
                                  onChange={(e) => setEditCommentBody(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSaveCommentEdit(c.id);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingCommentId(null);
                                      setEditCommentBody('');
                                    }
                                  }}
                                  rows={2}
                                  className="w-full text-sm border border-indigo-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                  autoFocus
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleSaveCommentEdit(c.id)}
                                    className="px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setEditingCommentId(null); setEditCommentBody(''); }}
                                    className="px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-neutral-800 whitespace-pre-wrap break-words leading-relaxed">
                                {c.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Auto-scroll anchor */}
                <div ref={commentEndRef} />
              </div>

              {/* Compose area */}
              <div className="border-t border-neutral-200 px-4 py-3">
                <div className="flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="Write a comment... (Enter to send, Shift+Enter for new line)"
                    data-testid="comment-input"
                    rows={2}
                    className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={posting || !newComment.trim()}
                    data-testid="comment-submit"
                    className="self-end rounded-md bg-indigo-600 px-3 py-2 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                  >
                    {posting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Activity ──────────────────────────────────────────── */}
          {activeTab === 'activity' && (
            <div className="p-4">
              {detail.activity.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {detail.activity.map((a) => (
                    <div key={a.id} className="flex gap-3 text-sm">
                      <Activity className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-gray-700">
                          {a.activityType.replace(/_/g, ' ').toLowerCase()}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatTime(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Documents ─────────────────────────────────────────── */}
          {activeTab === 'documents' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Documents ({detail.documents.length})
                </h4>
                <label className="inline-flex items-center gap-1 cursor-pointer rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                  <Upload className="h-3 w-3" />
                  Upload
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="doc-upload-input"
                  />
                </label>
              </div>
              {detail.documents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No documents linked to this task
                </p>
              ) : (
                <div className="space-y-2">
                  {detail.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.title || doc.fileName}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {(doc.sizeBytes / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Dependencies ─────────────────────────────────────── */}
          {activeTab === 'dependencies' && (
            <div className="p-4 space-y-4">
              {/* Add dependency action */}
              {canEditWork && (
                <div>
                  {showAddDep ? (
                    <div className="border border-indigo-200 rounded-lg p-3 space-y-2 bg-indigo-50/30">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={depSearch}
                          onChange={(e) => setDepSearch(e.target.value)}
                          placeholder="Search tasks to add as dependency..."
                          className="flex-1 text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          autoFocus
                        />
                        <select
                          value={depType}
                          onChange={(e) => setDepType(e.target.value as DependencyType)}
                          className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white"
                        >
                          <option value="FINISH_TO_START">Finish to Start</option>
                          <option value="START_TO_START">Start to Start</option>
                          <option value="FINISH_TO_FINISH">Finish to Finish</option>
                          <option value="START_TO_FINISH">Start to Finish</option>
                        </select>
                        <button onClick={() => { setShowAddDep(false); setDepSearch(''); setDepSearchResults([]); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                      {depSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {depSearchResults.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleAddDependency(t.id)}
                              disabled={addingDep}
                              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-indigo-100 text-sm"
                            >
                              <span className={`h-2 w-2 rounded-full shrink-0 ${t.status === 'DONE' ? 'bg-green-500' : t.status === 'BLOCKED' ? 'bg-red-500' : 'bg-gray-400'}`} />
                              <span className="truncate">{t.title}</span>
                              <span className="ml-auto text-[10px] text-gray-400">{t.status}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {depSearch.trim() && depSearchResults.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">No matching tasks</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddDep(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      + Add Dependency
                    </button>
                  )}
                </div>
              )}

              {depsCount === 0 && !showAddDep ? (
                <div className="text-center py-8">
                  <GitBranch className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No dependencies</p>
                  <p className="text-xs text-gray-300 mt-1">Add dependencies to track blockers</p>
                </div>
              ) : (
                <>
                  {detail.dependencies.blockedBy.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-red-600 uppercase mb-2">
                        Blocked By ({detail.dependencies.blockedBy.length})
                      </h4>
                      <div className="space-y-1">
                        {detail.dependencies.blockedBy.map((dep) => (
                          <div
                            key={dep.id}
                            className="group flex items-center gap-2 rounded border border-red-100 bg-red-50 p-2 text-sm"
                          >
                            <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                            <span
                              className="text-gray-800 truncate flex-1 cursor-pointer hover:text-indigo-600"
                              onClick={() => {
                                onClose();
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: dep.predecessorTaskId } }));
                                }, 100);
                              }}
                            >
                              {dep.predecessorTaskId.slice(0, 8)}... <span className="text-[10px] text-gray-400">{dep.type}</span>
                            </span>
                            {canEditWork && (
                              <button
                                onClick={() => handleRemoveDependency(dep.predecessorTaskId, dep.type as DependencyType)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                                title="Remove dependency"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detail.dependencies.blocking.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">
                        Blocking ({detail.dependencies.blocking.length})
                      </h4>
                      <div className="space-y-1">
                        {detail.dependencies.blocking.map((dep) => (
                          <div
                            key={dep.id}
                            className="group flex items-center gap-2 rounded border border-orange-100 bg-orange-50 p-2 text-sm"
                          >
                            <ArrowRight className="h-4 w-4 text-orange-400 shrink-0" />
                            <span
                              className="text-gray-800 truncate flex-1 cursor-pointer hover:text-indigo-600"
                              onClick={() => {
                                onClose();
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent('open-task-detail', { detail: { taskId: dep.successorTaskId } }));
                                }, 100);
                              }}
                            >
                              {dep.successorTaskId.slice(0, 8)}... <span className="text-[10px] text-gray-400">{dep.type}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Links (Risks + Changes) ───────────────────────────── */}
          {activeTab === 'links' && (
            <div className="p-4 space-y-4">
              {linksCount === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No linked risks or change requests
                </p>
              ) : (
                <>
                  {detail.risks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">
                        Risks ({detail.risks.length})
                      </h4>
                      <div className="space-y-1">
                        {detail.risks.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between rounded border p-2"
                          >
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium">{r.title}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {r.severity} · {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {detail.changeRequests.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">
                        Change Requests ({detail.changeRequests.length})
                      </h4>
                      <div className="space-y-1">
                        {detail.changeRequests.map((cr) => (
                          <div
                            key={cr.id}
                            className="flex items-center justify-between rounded border p-2"
                          >
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">{cr.title}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {cr.type} · {cr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
