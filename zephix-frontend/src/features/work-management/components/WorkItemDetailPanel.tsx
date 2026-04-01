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
  Circle,
  ArrowRight,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  getTaskDetail,
  addComment,
  uploadDocumentForTask,
  moveTask as moveTaskApi,
  type TaskDetailDto,
} from '../api/taskDetail.api';
import {
  WorkItemOverviewTab,
  WorkItemCommentsTab,
  WorkItemActivityTab,
  WorkItemDocumentsTab,
  WorkItemDependenciesTab,
  WorkItemLinksTab,
} from './work-item-detail';
import { apiClient } from '@/lib/api/client';
import { useExplanations } from '@/features/explanations';
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

// Lifecycle badge and helpers moved to WorkItemOverviewTab

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
          {activeTab === 'overview' && (
            <WorkItemOverviewTab
              detail={detail}
              explanations={explanations}
              canEditWork={canEditWork}
              onSaveAC={handleSaveAC}
              onToggleSubtask={handleToggleSubtask}
              onCreateSubtask={handleCreateSubtask}
              newSubtaskTitle={newSubtaskTitle}
              onNewSubtaskTitleChange={setNewSubtaskTitle}
              creatingSubtask={creatingSubtask}
              onClose={onClose}
            />
          )}

          {activeTab === 'comments' && (
            <WorkItemCommentsTab
              detail={detail}
              userId={user?.id}
              userRole={user?.role}
              newComment={newComment}
              posting={posting}
              editingCommentId={editingCommentId}
              editCommentBody={editCommentBody}
              onNewCommentChange={setNewComment}
              onAddComment={handleAddComment}
              onStartEdit={(id, body) => { setEditingCommentId(id); setEditCommentBody(body); }}
              onCancelEdit={() => { setEditingCommentId(null); setEditCommentBody(''); }}
              onSaveEdit={handleSaveCommentEdit}
              onEditBodyChange={setEditCommentBody}
              onDeleteComment={handleDeleteComment}
            />
          )}

          {activeTab === 'activity' && (
            <WorkItemActivityTab detail={detail} />
          )}

          {activeTab === 'documents' && (
            <WorkItemDocumentsTab detail={detail} onFileUpload={handleFileUpload} />
          )}

          {activeTab === 'dependencies' && (
            <WorkItemDependenciesTab
              detail={detail}
              canEditWork={canEditWork}
              showAddDep={showAddDep}
              depSearch={depSearch}
              depSearchResults={depSearchResults}
              depType={depType}
              addingDep={addingDep}
              onToggleAddDep={setShowAddDep}
              onDepSearchChange={setDepSearch}
              onDepTypeChange={setDepType}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
              onClearSearch={() => { setShowAddDep(false); setDepSearch(''); setDepSearchResults([]); }}
              onClose={onClose}
            />
          )}

          {activeTab === 'links' && (
            <WorkItemLinksTab detail={detail} />
          )}
        </div>
      </div>
    </>
  );
}
