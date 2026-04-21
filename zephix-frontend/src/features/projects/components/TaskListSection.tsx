/**
 * PHASE 7 MODULE 7.1: Task List Section
 *
 * Displays work items (tasks) for a project with:
 * - Create task form
 * - Inline status change
 * - Assignee display
 * - Due date display
 * - Comment panel
 * - Activity log
 *
 * OPTIMISTIC UPDATES:
 * - Status change: instant UI update, rollback on error
 * - Create task: temp ID appears immediately, replaced on success
 * - Add comment: temp comment appears, replaced/removed on success/error
 * - Bulk delete: optimistic remove, rollback on error
 * - Bulk status: NOT optimistic (STRICT validation may reject)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { isAdminUser, isGuestUser } from '@/utils/roles';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';
import {
  addComment,
  addDependency,
  createTask,
  deleteTask,
  listActivity,
  listComments,
  listDependencies,
  bulkUpdate,
  listTasks,
  removeDependency,
  restoreTask,
  updateTask,
  type TaskActivityItem,
  type TaskComment,
  type TaskDependency,
  type UpdateTaskPatch,
  type WorkTask,
  type WorkTaskStatus,
} from '@/features/work-management/workTasks.api';
import {
  notifyGovernanceBulkPartialSuccess,
  notifyGovernanceRuleBlocked,
} from '@/features/work-management/governanceTaskUpdateErrors';
import { invalidateStatsCache } from '@/features/work-management/workTasks.stats.api';
import { AcceptanceCriteriaEditor } from '@/features/work-management/components/AcceptanceCriteriaEditor';
import { CompletionBar } from '@/features/work-management/components/CompletionBar';
import { computeTaskCompletion } from '@/features/work-management/statusWeights';

// Generate temporary ID for optimistic inserts
function tempId(): string {
  return `temp:${crypto.randomUUID()}`;
}

// Error code constants
const ERR_WORKSPACE_REQUIRED = 'WORKSPACE_REQUIRED';
const ERR_VALIDATION_ERROR = 'VALIDATION_ERROR';

/** Matches backend list cap and Waterfall/Board loads (see work-tasks MAX_LIMIT). */
const WORK_TASK_LIST_PAGE_SIZE = 200;

// Extract error details from API response
function getErrorDetails(error: any): { code?: string; message?: string; invalidTransitions?: any[] } {
  const data = error?.response?.data || error;
  return {
    code: data?.code,
    message: data?.message || 'An error occurred',
    invalidTransitions: data?.invalidTransitions,
  };
}

type WorkspaceMember = {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

interface Props {
  projectId: string;
  workspaceId: string;
}

export function TaskListSection({ projectId, workspaceId }: Props) {
  const { user } = useAuth();
  const { isReadOnly } = useWorkspaceRole(workspaceId);
  const { getWorkspaceMembers, setWorkspaceMembers } = useWorkspaceStore();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  /** True when server reports more tasks than fit in one page at WORK_TASK_LIST_PAGE_SIZE. */
  const [taskListMayBeIncomplete, setTaskListMayBeIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [activities, setActivities] = useState<Record<string, TaskActivityItem[]>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [showActivity, setShowActivity] = useState<Record<string, boolean>>({});
  const [showDeps, setShowDeps] = useState<Record<string, boolean>>({});
  const [showAC, setShowAC] = useState<Record<string, boolean>>({});
  const [deps, setDeps] = useState<Record<string, { predecessors: TaskDependency[]; successors: TaskDependency[] }>>({});
  const [addingDep, setAddingDep] = useState<Record<string, boolean>>({});
  const [depSearch, setDepSearch] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});

  // PHASE 7 MODULE 7.4: Bulk actions state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'status' | 'assign' | 'dueDate' | 'clearDueDate' | 'unassign' | 'delete' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<WorkTaskStatus>('TODO');
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');
  const [bulkDueDate, setBulkDueDate] = useState<string>('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // OPTIMISTIC UPDATES: Rollback storage for failed operations
  const rollbackTasks = useRef<Map<string, WorkTask>>(new Map());
  const rollbackComments = useRef<Map<string, TaskComment[]>>(new Map());

  // ADMIN ONLY: Recently deleted tasks panel
  const [showDeletedPanel, setShowDeletedPanel] = useState(false);
  const [deletedTasks, setDeletedTasks] = useState<WorkTask[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [restoringTaskIds, setRestoringTaskIds] = useState<Set<string>>(new Set());
  const deletedInFlight = useRef(false);

  // PHASE 7 MODULE 7.1 FIX: Use cached members
  const cachedMembers = workspaceId ? getWorkspaceMembers(workspaceId) : null;
  const [workspaceMembers, setWorkspaceMembersState] = useState<WorkspaceMember[]>(cachedMembers || []);

  // Phase 3 (Template Center): per-project team — Activities assignee pool is filtered to this set
  const [projectTeamMemberIds, setProjectTeamMemberIds] = useState<string[] | null>(null);

  // Phase 3: project-level linked documents (surfaced in Activities, managed in Overview)
  const [projectDocs, setProjectDocs] = useState<Array<{ id: string; title: string }>>([]);

  // Phase 3: assignee pool is project team only (fall back to all workspace members if team not yet loaded or empty)
  const assigneePool = useMemo(() => {
    if (!projectTeamMemberIds || projectTeamMemberIds.length === 0) {
      // No project team set yet — fall back to workspace members so picker isn't empty
      return workspaceMembers;
    }
    const teamSet = new Set(projectTeamMemberIds);
    return workspaceMembers.filter((m: any) => {
      const id = m.userId || m.user?.id;
      return id && teamSet.has(id);
    });
  }, [workspaceMembers, projectTeamMemberIds]);

  const taskChildrenByParent = useMemo(() => {
    const m = new Map<string, WorkTask[]>();
    for (const t of tasks) {
      if (t.deletedAt) continue;
      if (!t.parentTaskId) continue;
      const arr = m.get(t.parentTaskId) ?? [];
      arr.push(t);
      m.set(t.parentTaskId, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    }
    return m;
  }, [tasks]);

  // PHASE 7 MODULE 7.1 FIX: Consistent role checks
  const isAdmin = isAdminUser(user);
  const isGuest = isGuestUser(user);
  const canEdit = !isReadOnly && !isGuest;
  // Use the workspaceId prop as source of truth — the parent (ProjectTasksTab)
  // already knows the correct workspace from ProjectPageLayout.
  const hasWorkspaceMismatch = !workspaceId;

  // Handle WORKSPACE_REQUIRED errors consistently
  const handleWorkspaceError = useCallback(() => {
    toast.error('Workspace selection required. Please select a workspace.');
    // Could redirect to workspace picker here if needed
  }, []);

  useEffect(() => {
    if (projectId && workspaceId) {
      loadTasks();
      loadWorkspaceMembers();
      loadProjectTeam();
    }
  }, [projectId, workspaceId]);

  // Phase 3: load per-project team to filter Activities assignee pool
  async function loadProjectTeam() {
    if (!projectId) return;
    try {
      const { projectsApi } = await import('@/features/projects/projects.api');
      const res = await projectsApi.getProjectTeam(projectId);
      setProjectTeamMemberIds(res.teamMemberIds || []);
    } catch {
      setProjectTeamMemberIds([]);
    }
  }

  // Phase 3: load project-level linked documents (surfaced in Activities, managed in Overview)
  useEffect(() => {
    if (!projectId || !workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const { api } = await import('@/lib/api');
        const res: any = await api.get(`/work/workspaces/${workspaceId}/projects/${projectId}/documents`);
        const data = res?.data ?? res;
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) {
          setProjectDocs(items.map((d: any) => ({ id: d.id, title: d.title })));
        }
      } catch {
        if (!cancelled) setProjectDocs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, workspaceId]);

  async function loadWorkspaceMembers() {
    if (!workspaceId) return;

    // PHASE 7 MODULE 7.1 FIX: Check cache first
    const cached = getWorkspaceMembers(workspaceId);
    if (cached) {
      setWorkspaceMembersState(cached);
      return;
    }

    try {
      const members = await listWorkspaceMembers(workspaceId);
      const normalized = (members || [])
        .filter((member): member is WorkspaceMember => typeof member.userId === 'string' && member.userId.length > 0)
        .map((member) => {
          const base = { id: member.id, userId: member.userId };
          if (member.user) {
            return { ...base, user: { ...member.user, id: member.user.id || member.userId } };
          }
          return base;
        });
      setWorkspaceMembers(workspaceId, normalized); // Cache it
      setWorkspaceMembersState(normalized);
    } catch (error) {
      console.error('Failed to load workspace members:', error);
    }
  }

  async function loadTasks(silent = false) {
    if (!projectId || !workspaceId) return;
    if (hasWorkspaceMismatch) {
      if (!silent) handleWorkspaceError();
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    try {
      const result = await listTasks({ projectId, limit: WORK_TASK_LIST_PAGE_SIZE });
      const items = Array.isArray(result.items) ? result.items : [];
      setTasks(items);
      setTaskListMayBeIncomplete(result.total > items.length);
      // Preserve selections: filter to only IDs that still exist
      setSelectedTaskIds((prev) => new Set([...prev].filter((id) => items.some((task) => task.id === id))));
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      const { code, message } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        if (!silent) handleWorkspaceError();
      } else if (!silent) {
        toast.error(message || 'Failed to load tasks');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadComments(taskId: string) {
    try {
      const result = await listComments(taskId);
      setComments(prev => ({ ...prev, [taskId]: result.items || [] }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }

  async function loadActivities(taskId: string) {
    try {
      const result = await listActivity(taskId);
      setActivities(prev => ({ ...prev, [taskId]: result.items || [] }));
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }

  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId || !workspaceId) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const assigneeId = (formData.get('assigneeId') as string) || undefined;
    const dueDate = formData.get('dueDate') as string || undefined;

    if (!title.trim()) return;

    // OPTIMISTIC: Create temp task and insert immediately
    // FIX #3: Use placeholder values for server-only fields, mark as optimistic to avoid leaking to analytics
    const tempTaskId = tempId();
    const nowIso = new Date().toISOString();
    const tempTask: WorkTask = {
      id: tempTaskId,
      organizationId: 'temp-org', // Placeholder - replaced by server on success
      workspaceId: workspaceId,
      projectId,
      parentTaskId: null,
      phaseId: null,
      title: title.trim(),
      description: description?.trim() || null,
      status: 'TODO' as WorkTaskStatus,
      type: 'TASK',
      priority: 'MEDIUM',
      assigneeUserId: assigneeId || null,
      reporterUserId: user?.id ?? 'temp-user', // Placeholder if no user
      startDate: null,
      dueDate: dueDate || null,
      completedAt: null,
      estimatePoints: null,
      estimateHours: null,
      remainingHours: null,
      actualHours: null,
      actualStartDate: null,
      actualEndDate: null,
      iterationId: null,
      committed: false,
      rank: null,
      tags: ['__optimistic__'], // Marker to identify temp tasks, stripped on server replace
      metadata: { optimistic: true }, // Flag to prevent leaking to analytics
      acceptanceCriteria: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
      deletedByUserId: null,
      approvalStatus: 'not_required',
      documentRequired: false,
      remarks: null,
      isMilestone: false,
    };

    // Insert temp task at top of list
    setTasks(prev => [tempTask, ...prev]);
    setShowCreateForm(false);
    e.currentTarget.reset();
    setCreating(true);

    try {
      const input = {
        projectId,
        title: title.trim(),
      } as Parameters<typeof createTask>[0];
      const trimmedDescription = description?.trim();
      if (trimmedDescription) input.description = trimmedDescription;
      if (assigneeId) input.assigneeUserId = assigneeId;
      if (dueDate) input.dueDate = dueDate;

      const created = await createTask(input);

      // Replace temp task with real task from server
      setTasks(prev => prev.map(t => t.id === tempTaskId ? created : t));
      toast.success('Task created');

      // Invalidate stats cache and dispatch event for KPI invalidation
      invalidateStatsCache(projectId);
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
    } catch (error: any) {
      console.error('Failed to create task:', error);
      // Remove temp task on error
      setTasks(prev => prev.filter(t => t.id !== tempTaskId));
      const { code, message } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      } else if (notifyGovernanceRuleBlocked(error)) {
        // Governance toast already shown
      } else {
        toast.error(message || 'Failed to create task');
      }
      setShowCreateForm(true); // Re-open form so user can retry
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: WorkTaskStatus) {
    if (!canEdit) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }

    // FIX #5: Capture prev status and store rollback inside functional update
    // to avoid stale closure if user toggles twice fast
    let prevStatus: WorkTaskStatus | null = null;

    setTasks(prev => {
      const currentTask = prev.find(t => t.id === taskId);
      if (!currentTask) return prev;

      prevStatus = currentTask.status;
      rollbackTasks.current.set(taskId, { ...currentTask });

      return prev.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t
      );
    });

    // If task wasn't found, abort
    if (prevStatus === null) return;
    const capturedPrevStatus = prevStatus; // TypeScript narrowing

    try {
      const updated = await updateTask(taskId, { status: newStatus });

      // Reconcile with server response
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      rollbackTasks.current.delete(taskId);

      // Invalidate stats cache and dispatch event for KPI invalidation
      invalidateStatsCache(projectId);
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));

      // Background refresh activities if panel is open
      if (activities[taskId]) {
        loadActivities(taskId);
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      // ROLLBACK: Restore previous state (no stats invalidation on error)
      const rollback = rollbackTasks.current.get(taskId);
      if (rollback) {
        setTasks(prev => prev.map(t => t.id === taskId ? rollback : t));
        rollbackTasks.current.delete(taskId);
      }

      const { code, message } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      } else if (code === 'INVALID_STATUS_TRANSITION') {
        toast.error(`Cannot change from ${capturedPrevStatus} to ${newStatus}`);
      } else if (notifyGovernanceRuleBlocked(error)) {
        // Governance toast already shown
      } else {
        toast.error(message || 'Failed to update status');
      }
    }
  }

  async function handleAddComment(taskId: string) {
    const commentText = newComment[taskId];
    if (!commentText?.trim()) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }

    // OPTIMISTIC: Create temp comment and insert immediately
    const tempCommentId = tempId();
    const nowIso = new Date().toISOString();
    const tempComment: TaskComment = {
      id: tempCommentId,
      taskId,
      body: commentText.trim(),
      authorUserId: user?.id || 'unknown',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // FIX #4: Store rollback inside functional update to avoid stale closure
    setComments(prev => {
      rollbackComments.current.set(taskId, prev[taskId] || []);
      return {
        ...prev,
        [taskId]: [...(prev[taskId] || []), tempComment],
      };
    });
    setNewComment(prev => ({ ...prev, [taskId]: '' }));
    setPostingComment(prev => ({ ...prev, [taskId]: true }));

    try {
      const created = await addComment(taskId, commentText.trim());

      // Replace temp comment with real comment from server
      setComments(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).map(c =>
          c.id === tempCommentId ? created : c
        ),
      }));
      rollbackComments.current.delete(taskId);

      // Background refresh activities if panel is open
      if (activities[taskId]) {
        loadActivities(taskId);
      }
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      // ROLLBACK: Restore previous comments
      const rollback = rollbackComments.current.get(taskId);
      if (rollback !== undefined) {
        setComments(prev => ({ ...prev, [taskId]: rollback }));
        rollbackComments.current.delete(taskId);
      } else {
        // Fallback: remove temp comment
        setComments(prev => ({
          ...prev,
          [taskId]: (prev[taskId] || []).filter(c => c.id !== tempCommentId),
        }));
      }

      const { code, message } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      } else {
        toast.error(message || 'Failed to add comment');
      }
    } finally {
      setPostingComment(prev => ({ ...prev, [taskId]: false }));
    }
  }

  function toggleComments(taskId: string) {
    const isOpen = showComments[taskId];
    setShowComments(prev => ({ ...prev, [taskId]: !isOpen }));
    if (!isOpen && !comments[taskId]) {
      loadComments(taskId);
    }
  }

  function toggleActivity(taskId: string) {
    const isOpen = showActivity[taskId];
    setShowActivity(prev => ({ ...prev, [taskId]: !isOpen }));
    if (!isOpen && !activities[taskId]) {
      loadActivities(taskId);
    }
  }

  function toggleDeps(taskId: string) {
    const isOpen = showDeps[taskId];
    setShowDeps(prev => ({ ...prev, [taskId]: !isOpen }));
    if (!isOpen && !deps[taskId]) {
      loadDeps(taskId);
    }
  }

  function toggleAC(taskId: string) {
    setShowAC(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  async function handleSaveAC(taskId: string, items: Array<{ text: string; done: boolean }>) {
    const saved = await updateTask(taskId, { acceptanceCriteria: items });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, acceptanceCriteria: saved.acceptanceCriteria } : t));
  }

  async function loadDeps(taskId: string) {
    try {
      const result = await listDependencies(taskId);
      setDeps(prev => ({ ...prev, [taskId]: result }));
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    }
  }

  async function handleAddDep(taskId: string, predecessorTaskId: string) {
    if (addingDep[taskId]) return;
    setAddingDep(prev => ({ ...prev, [taskId]: true }));
    try {
      await addDependency(taskId, predecessorTaskId, 'FINISH_TO_START');
      toast.success('Dependency added');
      await loadDeps(taskId);
      setDepSearch(prev => ({ ...prev, [taskId]: '' }));
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to add dependency';
      toast.error(msg);
    } finally {
      setAddingDep(prev => ({ ...prev, [taskId]: false }));
    }
  }

  async function handleRemoveDep(taskId: string, predecessorTaskId: string) {
    try {
      await removeDependency(taskId, predecessorTaskId);
      toast.success('Dependency removed');
      await loadDeps(taskId);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove dependency');
    }
  }

  function getStatusColor(status: WorkTaskStatus): string {
    switch (status) {
      case 'TODO':
      case 'BACKLOG':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
      case 'IN_REVIEW':
      case 'BLOCKED':
        return 'bg-blue-100 text-blue-800';
      case 'DONE':
      case 'CANCELED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusLabel(status: WorkTaskStatus): string {
    switch (status) {
      case 'BACKLOG':
        return 'Backlog';
      case 'TODO':
        return 'Todo';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'BLOCKED':
        return 'Blocked';
      case 'IN_REVIEW':
        return 'In Review';
      case 'DONE':
        return 'Done';
      case 'CANCELED':
        return 'Canceled';
      default:
        return status;
    }
  }

  function getUserLabel(userId?: string | null): string {
    if (!userId) return 'Unknown';
    const member = workspaceMembers.find((m: any) => m.userId === userId);
    const user = member?.user || (member ? { id: member.userId, email: 'Unknown' } : null);
    if (!user) return userId;
    const displayName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;
    return displayName || userId;
  }

  // PHASE 7 MODULE 7.4: Bulk action handlers
  function toggleTaskSelection(taskId: string) {
    if (loading) return;
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (loading) return;
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    }
  }

  function clearSelection() {
    setSelectedTaskIds(new Set());
    setBulkAction(null);
  }

  async function handleBulkUpdate() {
    if (selectedTaskIds.size === 0 || !bulkAction) return;
    if (loading) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }

    setBulkProcessing(true);
    const ids = Array.from(selectedTaskIds);

    try {
      const patch: UpdateTaskPatch = {};

      if (bulkAction === 'status') {
        patch.status = bulkStatus;
      } else if (bulkAction === 'assign') {
        patch.assigneeUserId = bulkAssigneeId || null;
      } else if (bulkAction === 'unassign') {
        patch.assigneeUserId = null;
      } else if (bulkAction === 'dueDate') {
        patch.dueDate = bulkDueDate || null;
      } else if (bulkAction === 'clearDueDate') {
        patch.dueDate = null;
      }

      // Use atomic bulk API (PATCH /work/tasks/actions/bulk-update)
      try {
        const bulkInput: any = { taskIds: ids };
        if (patch.status !== undefined) bulkInput.status = patch.status;
        if (patch.assigneeUserId !== undefined) bulkInput.assigneeUserId = patch.assigneeUserId;
        if (patch.dueDate !== undefined) bulkInput.dueDate = patch.dueDate;

        const result = await bulkUpdate(bulkInput);
        if (result.blockedCount && result.blockedCount > 0) {
          notifyGovernanceBulkPartialSuccess(result);
        } else {
          toast.success(`Updated ${result.updated} task${result.updated > 1 ? 's' : ''}`);
        }

        // Refresh task list to reflect changes
        invalidateStatsCache(projectId);
        window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
        const refreshed = await listTasks({ projectId, limit: WORK_TASK_LIST_PAGE_SIZE });
        setTasks(refreshed.items);
        setTaskListMayBeIncomplete(refreshed.total > refreshed.items.length);
      } catch (bulkError: any) {
        const { code, message, invalidTransitions } = getErrorDetails(bulkError);

        if (code === ERR_VALIDATION_ERROR && invalidTransitions?.length) {
          const details = invalidTransitions.slice(0, 3)
            .map((t: any) => `${t.from} → ${t.to}`)
            .join(', ');
          toast.error(`Bulk update failed: ${details}`);
        } else if (code === ERR_WORKSPACE_REQUIRED) {
          handleWorkspaceError();
        } else if (notifyGovernanceRuleBlocked(bulkError)) {
          // Governance toast already shown
        } else {
          toast.error(message || 'Bulk update failed');
        }
      }

      setSelectedTaskIds(new Set());
      setBulkAction(null);
    } catch (error: any) {
      console.error('Bulk update failed:', error);
      const { code, message } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      } else {
        toast.error(message || 'Bulk update failed');
      }
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedTaskIds.size === 0) return;
    if (loading) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }

    if (!confirm(`Delete ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}?`)) {
      return;
    }

    const ids = Array.from(selectedTaskIds);

    // FIX #2: Store full task list snapshot before optimistic removal (preserves order)
    const snapshotBeforeDelete = [...tasks];
    const idsSet = new Set(ids);

    setTasks(prev => prev.filter(t => !idsSet.has(t.id)));
    setSelectedTaskIds(new Set());
    setBulkAction(null);
    setBulkProcessing(true);

    try {
      const results = await Promise.allSettled(ids.map((id) => deleteTask(id)));

      // FIX #1: Track failed IDs by index, not by slice assumption
      const succeededIds = new Set<string>();
      const failedIds = new Set<string>();
      results.forEach((r, idx) => {
        const taskId = ids[idx];
        if (!taskId) return; // Safety check
        if (r.status === 'fulfilled') {
          succeededIds.add(taskId);
        } else {
          failedIds.add(taskId);
        }
      });

      if (succeededIds.size > 0) {
        toast.success(`Deleted ${succeededIds.size} task${succeededIds.size > 1 ? 's' : ''}`);
        // Invalidate stats cache and dispatch event for KPI invalidation
        invalidateStatsCache(projectId);
        window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
        // Refresh deleted panel if open to show newly deleted tasks
        refreshDeletedPanelIfOpen();
        // Reload from server so cascaded child deletes and caps stay consistent
        await loadTasks(true);
      }

      if (failedIds.size > 0) {
        if (succeededIds.size === 0) {
          setTasks(snapshotBeforeDelete);
        }

        const firstRejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
        const { code, message } = getErrorDetails(firstRejected?.reason);
        if (code === ERR_WORKSPACE_REQUIRED) {
          handleWorkspaceError();
        } else {
          toast.error(`${failedIds.size} task${failedIds.size > 1 ? 's' : ''} failed to delete: ${message}`);
        }
      }
    } catch (error: any) {
      console.error('Bulk delete failed:', error);
      // FULL ROLLBACK: Restore entire snapshot
      setTasks(snapshotBeforeDelete);

      const { code, message } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      } else {
        toast.error(message || 'Bulk delete failed');
      }
    } finally {
      setBulkProcessing(false);
    }
  }

  // ============================================================
  // ADMIN ONLY: Recently Deleted Tasks
  // ============================================================

  async function loadDeletedTasks() {
    if (!projectId || !isAdmin) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }
    // In-flight guard to prevent duplicate concurrent fetches
    if (deletedInFlight.current) return;
    deletedInFlight.current = true;

    setDeletedLoading(true);
    try {
      const PAGE = WORK_TASK_LIST_PAGE_SIZE;
      const MAX_PAGES = 25;
      const byId = new Map<string, WorkTask>();
      let offset = 0;
      let hitPageCap = false;
      for (let p = 0; p < MAX_PAGES; p++) {
        const result = await listTasks({
          projectId,
          includeDeleted: true,
          limit: PAGE,
          offset,
        });
        const items = Array.isArray(result.items) ? result.items : [];
        for (const t of items) {
          if (t.deletedAt) {
            byId.set(t.id, t);
          }
        }
        if (items.length < PAGE) {
          break;
        }
        offset += PAGE;
        if (p === MAX_PAGES - 1) {
          hitPageCap = true;
          break;
        }
      }
      const deleted = Array.from(byId.values()).sort((a, b) => {
        const ta = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const tb = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return tb - ta;
      });
      setDeletedTasks(deleted);
      if (hitPageCap) {
        toast.info('Not all deleted tasks could be loaded in one session (page limit reached).');
      }
    } catch (error: any) {
      console.error('Failed to load deleted tasks:', error);
      const { code } = getErrorDetails(error);
      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      }
      // Silent failure for deleted panel - don't toast
    } finally {
      deletedInFlight.current = false;
      setDeletedLoading(false);
    }
  }

  async function handleRestoreTask(taskId: string) {
    if (!isAdmin) return;
    if (hasWorkspaceMismatch) {
      handleWorkspaceError();
      return;
    }

    // Disable row during restore
    setRestoringTaskIds(prev => new Set(prev).add(taskId));

    try {
      const restored = await restoreTask(taskId);

      // Remove from deleted list
      setDeletedTasks(prev => prev.filter(t => t.id !== taskId));

      // Add to active list if it matches current view (same project)
      // Prevent duplicates by checking if task already exists, then merge or insert at top
      if (restored.projectId === projectId) {
        setTasks(prev => {
          const exists = prev.some(t => t.id === restored.id);
          if (exists) {
            // Replace existing (edge case: stale data)
            return prev.map(t => t.id === restored.id ? restored : t);
          }
          // Insert at top (MVP: consistent top insertion for restored tasks)
          return [restored, ...prev];
        });
      }

      // Invalidate stats cache and dispatch events
      invalidateStatsCache(projectId);
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));

      // RISK #2 MITIGATION: If restored task has a phaseId, also trigger plan refresh
      // This handles edge case where task's phase may have changed state
      if (restored.phaseId) {
        window.dispatchEvent(new CustomEvent('plan:changed', { detail: { projectId } }));
      }

      toast.success('Task restored');
    } catch (error: any) {
      console.error('Failed to restore task:', error);
      const { code, message } = getErrorDetails(error);

      if (code === ERR_WORKSPACE_REQUIRED) {
        handleWorkspaceError();
      } else if (code === 'TASK_NOT_FOUND') {
        toast.error('Task not found or already permanently deleted');
        // Remove from list since it's gone
        setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
      } else if (code === 'TASK_NOT_DELETED') {
        // Treat as success from UX standpoint - task is already active
        // Remove from deleted list silently, no error toast, NO full loadTasks
        setDeletedTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        toast.error(message || 'Failed to restore task');
      }
    } finally {
      // Always clear restoring state
      setRestoringTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  // Refresh deleted panel when it's open and count might have changed
  function refreshDeletedPanelIfOpen() {
    if (showDeletedPanel && isAdmin) {
      loadDeletedTasks();
    }
  }

  // Load deleted tasks when panel opens or projectId changes while panel is open
  useEffect(() => {
    if (!showDeletedPanel || !isAdmin) return;

    // Reset and reload when projectId changes to show correct project's deleted tasks
    setDeletedTasks([]);
    loadDeletedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeletedPanel, isAdmin, projectId]);

  function formatActivity(activity: TaskActivityItem): string {
    const actor = getUserLabel(activity.userId);

    switch (activity.type) {
      case 'created':
        return `${actor} created this task`;
      case 'status_changed':
        const from = (activity.payload as any)?.from || 'unknown';
        const to = (activity.payload as any)?.to || 'unknown';
        return `${actor} changed status from ${from} to ${to}`;
      case 'assigned':
        return `${actor} assigned this task`;
      case 'unassigned':
        return `${actor} unassigned this task`;
      case 'due_date_changed':
        return `${actor} changed due date`;
      case 'comment_added':
        return `${actor} added a comment`;
      case 'updated':
        return `${actor} updated this task`;
      default:
        return `${actor} ${activity.type}`;
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div id="task-list-section" className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
        {canEdit && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-sm"
          >
            + New Task
          </Button>
        )}
      </div>

      {/* Phase 3: Project-linked documents banner — managed in Overview, surfaced here for execution context */}
      {projectDocs.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Project documents
            </span>
            <span className="text-[11px] text-slate-400">· managed in Overview</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {projectDocs.slice(0, 8).map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                📄 {doc.title}
              </span>
            ))}
            {projectDocs.length > 8 && (
              <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
                +{projectDocs.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {taskListMayBeIncomplete && (
        <div
          className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800"
          data-testid="task-list-limit-banner"
        >
          Showing first {WORK_TASK_LIST_PAGE_SIZE} tasks. Some tasks may not be visible.
        </div>
      )}

      {/* Create Task Form */}
      {showCreateForm && canEdit && (
        <form onSubmit={handleCreateTask} className="mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                className="w-full px-3 py-2 border rounded-md"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <select
                  name="assigneeId"
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Unassigned</option>
                  {assigneePool.map((member) => {
                    const user = member.user || { id: member.userId, email: 'Unknown' };
                    const displayName = user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email;
                    return (
                      <option key={member.userId} value={member.userId}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  name="dueDate"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateForm(false)}
                  disabled={creating}
                >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* PHASE 7 MODULE 7.4: Bulk Action Bar */}
      {selectedTaskIds.size > 0 && canEdit && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {bulkAction === null && (
              <>
                <Button
                  onClick={() => setBulkAction('status')}
                  variant="ghost"
                  className="text-sm"
                  disabled={bulkProcessing || loading}
                >
                  Change Status
                </Button>
                <Button
                  onClick={() => setBulkAction('assign')}
                  variant="ghost"
                  className="text-sm"
                  disabled={bulkProcessing || loading}
                >
                  Assign To
                </Button>
                <Button
                  onClick={() => setBulkAction('dueDate')}
                  variant="ghost"
                  className="text-sm"
                  disabled={bulkProcessing || loading}
                >
                  Set Due Date
                </Button>
                <Button
                  onClick={() => setBulkAction('clearDueDate')}
                  variant="ghost"
                  className="text-sm"
                  disabled={bulkProcessing || loading}
                >
                  Clear Due Date
                </Button>
                <Button
                  onClick={() => setBulkAction('unassign')}
                  variant="ghost"
                  className="text-sm"
                  disabled={bulkProcessing || loading}
                >
                  Unassign
                </Button>
                {isAdmin && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="ghost"
                    className="text-sm text-red-600 border-red-300 hover:bg-red-50"
                    disabled={bulkProcessing || loading}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
            {bulkAction === 'status' && (
              <div className="flex items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as WorkTaskStatus)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                </select>
                <Button onClick={handleBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="ghost" className="text-sm">
                  Cancel
                </Button>
              </div>
            )}
            {bulkAction === 'assign' && (
              <div className="flex items-center gap-2">
                <select
                  value={bulkAssigneeId}
                  onChange={(e) => setBulkAssigneeId(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="">Unassigned</option>
                  {assigneePool.map((member) => {
                    const user = member.user || { id: member.userId, email: 'Unknown' };
                    const displayName = user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email;
                    return (
                      <option key={member.userId} value={member.userId}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
                <Button onClick={handleBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="ghost" className="text-sm">
                  Cancel
                </Button>
              </div>
            )}
            {bulkAction === 'dueDate' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                />
                <Button onClick={handleBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="ghost" className="text-sm">
                  Cancel
                </Button>
              </div>
            )}
            {(bulkAction === 'clearDueDate' || bulkAction === 'unassign') && (
              <div className="flex items-center gap-2">
                <Button onClick={handleBulkUpdate} className="text-sm" disabled={bulkProcessing || loading}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="ghost" className="text-sm">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks yet</p>
          {canEdit && (
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="ghost"
              className="mt-4"
            >
              Create first task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* PHASE 7 MODULE 7.4: Header checkbox */}
          {canEdit && (
            <div className="flex items-center gap-2 pb-2 border-b">
              <input
                type="checkbox"
                checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                onChange={toggleSelectAll}
                disabled={loading}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>
          )}
          {tasks.map((task) => {
            // PHASE 7 MODULE 7.2: Check if this is the highlighted task from query param
            const urlParams = new URLSearchParams(window.location.search);
            const taskId = urlParams.get('taskId');
            const isHighlighted = taskId === task.id;

            return (
            <div
              key={task.id}
              data-task-id={task.id}
              className={`border rounded-lg p-4 ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${selectedTaskIds.has(task.id) ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              <div className="flex items-start justify-between">
                {/* PHASE 7 MODULE 7.4: Checkbox */}
                {canEdit && (
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.has(task.id)}
                    onChange={() => toggleTaskSelection(task.id)}
                    disabled={loading}
                    className="mt-1 mr-3 w-4 h-4 rounded border-gray-300"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {canEdit ? (
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as WorkTaskStatus)}
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)} border-0`}
                      >
                        <option value="TODO">Todo</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    {(() => {
                      const subs = (taskChildrenByParent.get(task.id) ?? []).filter((c) => !c.deletedAt);
                      const subSt = subs.map((c) => c.status);
                      const pct = computeTaskCompletion(
                        task.status,
                        subSt.length > 0 ? subSt : undefined,
                      );
                      return (
                        <div className="flex items-center gap-2" data-testid={`activities-completion-${task.id}`}>
                          <span className="text-gray-400">Completion</span>
                          <CompletionBar percent={pct} />
                        </div>
                      );
                    })()}
                    {task.assigneeUserId && (
                      <span>Assigned to: {getUserLabel(task.assigneeUserId)}</span>
                    )}
                    {task.dueDate && (
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments, Activity, Dependencies, AC Toggles */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => toggleAC(task.id)}
                  className="text-xs text-emerald-600 hover:text-emerald-800"
                >
                  {showAC[task.id] ? 'Hide' : 'Show'} Acceptance Criteria ({task.acceptanceCriteria?.length || 0})
                </button>
                <button
                  onClick={() => toggleComments(task.id)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showComments[task.id] ? 'Hide' : 'Show'} Comments ({comments[task.id]?.length || 0})
                </button>
                <button
                  onClick={() => toggleActivity(task.id)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  {showActivity[task.id] ? 'Hide' : 'Show'} Activity
                </button>
                <button
                  onClick={() => toggleDeps(task.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {showDeps[task.id] ? 'Hide' : 'Show'} Dependencies
                </button>
              </div>

              {/* Acceptance Criteria Panel */}
              {showAC[task.id] && (
                <AcceptanceCriteriaEditor
                  items={task.acceptanceCriteria || []}
                  onSave={(items) => handleSaveAC(task.id, items)}
                  readOnly={!canEdit}
                />
              )}

              {/* Comments Panel */}
              {showComments[task.id] && (
                <div className="mt-3 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Comments</h4>
                  <div className="space-y-2 mb-3">
                    {comments[task.id]?.map((comment) => (
                      <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-700">
                          {getUserLabel(comment.authorUserId)}
                        </div>
                        <div className="text-gray-600 mt-1">{comment.body}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment[task.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(task.id);
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleAddComment(task.id)}
                        disabled={!newComment[task.id]?.trim() || postingComment[task.id]}
                        className="text-sm"
                      >
                        {postingComment[task.id] ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Log */}
              {showActivity[task.id] && (
                <div className="mt-3 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Activity</h4>
                  <div className="space-y-2">
                    {activities[task.id]?.map((activity) => (
                      <div key={activity.id} className="text-xs text-gray-600">
                        <span className="font-medium">{formatActivity(activity)}</span>
                        <span className="text-gray-400 ml-2">
                          {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies Panel */}
              {showDeps[task.id] && (
                <div className="mt-3 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Dependencies</h4>
                  {/* Blocked by (predecessors) */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Blocked by</p>
                    {deps[task.id]?.predecessors?.length ? (
                      <div className="space-y-1">
                        {deps[task.id].predecessors.map((dep) => (
                          <div key={dep.id} className="flex items-center justify-between text-sm bg-red-50 p-2 rounded">
                            <span className="text-gray-700">{dep.predecessorTitle || dep.predecessorTaskId}</span>
                            {canEdit && (
                              <button
                                onClick={() => handleRemoveDep(task.id, dep.predecessorTaskId)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">None</p>
                    )}
                  </div>
                  {/* Blocking (successors) */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Blocking</p>
                    {deps[task.id]?.successors?.length ? (
                      <div className="space-y-1">
                        {deps[task.id].successors.map((dep) => (
                          <div key={dep.id} className="flex items-center text-sm bg-amber-50 p-2 rounded">
                            <span className="text-gray-700">{dep.successorTitle || dep.successorTaskId}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">None</p>
                    )}
                  </div>
                  {/* Add dependency */}
                  {canEdit && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Add "blocked by" dependency</p>
                      <div className="flex gap-2">
                        <select
                          value={depSearch[task.id] || ''}
                          onChange={(e) => setDepSearch(prev => ({ ...prev, [task.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="">Select a task...</option>
                          {tasks
                            .filter(t => t.id !== task.id && !t.deletedAt)
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                        <button
                          onClick={() => depSearch[task.id] && handleAddDep(task.id, depSearch[task.id])}
                          disabled={!depSearch[task.id] || addingDep[task.id]}
                          className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {addingDep[task.id] ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* ADMIN ONLY: Recently Deleted Tasks Panel */}
      {isAdmin && (
        <div className="mt-6 border-t pt-4">
          <button
            type="button"
            onClick={() => setShowDeletedPanel(prev => !prev)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <span className={`transform transition-transform ${showDeletedPanel ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span>Recently deleted</span>
            {deletedTasks.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
                {deletedTasks.length}
              </span>
            )}
          </button>

          {showDeletedPanel && (
            <div className="mt-3 space-y-2">
              {deletedLoading ? (
                <div className="text-sm text-gray-500 py-2">Loading deleted tasks...</div>
              ) : deletedTasks.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No deleted tasks</div>
              ) : (
                deletedTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 ${
                      restoringTaskIds.has(task.id) ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 line-through">
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Deleted {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : 'recently'}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRestoreTask(task.id)}
                      disabled={restoringTaskIds.has(task.id)}
                      className="ml-3 text-sm"
                      variant="ghost"
                    >
                      {restoringTaskIds.has(task.id) ? 'Restoring...' : 'Restore'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
