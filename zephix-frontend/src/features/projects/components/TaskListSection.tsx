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
import { useState, useEffect, useRef, useCallback } from 'react';
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
import { invalidateStatsCache } from '@/features/work-management/workTasks.stats.api';
import { TaskCreateForm } from './task-list/TaskCreateForm';
import { TaskBulkActions } from './task-list/TaskBulkActions';
import { TaskRow } from './task-list/TaskRow';
import { TaskDeletedPanel } from './task-list/TaskDeletedPanel';

// Generate temporary ID for optimistic inserts
function tempId(): string {
  return `temp:${crypto.randomUUID()}`;
}

// Error code constants
const ERR_WORKSPACE_REQUIRED = 'WORKSPACE_REQUIRED';
const ERR_VALIDATION_ERROR = 'VALIDATION_ERROR';

// Extract error details from API response
function getErrorDetails(error: any): { code?: string; message?: string; invalidTransitions?: any[] } {
  const data = error?.response?.data || error;
  return {
    code: data?.code,
    message: data?.message || 'An error occurred',
    invalidTransitions: data?.invalidTransitions,
  };
}

import type { WorkspaceMember } from './task-list/types';

interface Props {
  projectId: string;
  workspaceId: string;
}

export function TaskListSection({ projectId, workspaceId }: Props) {
  const { user } = useAuth();
  const { isReadOnly } = useWorkspaceRole(workspaceId);
  const { getWorkspaceMembers, setWorkspaceMembers, activeWorkspaceId } = useWorkspaceStore();
  const [tasks, setTasks] = useState<WorkTask[]>([]);
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

  // PHASE 7 MODULE 7.1 FIX: Consistent role checks
  const isAdmin = isAdminUser(user);
  const isGuest = isGuestUser(user);
  const canEdit = !isReadOnly && !isGuest;
  const hasWorkspaceMismatch = !activeWorkspaceId || activeWorkspaceId !== workspaceId;

  // Handle WORKSPACE_REQUIRED errors consistently
  const handleWorkspaceError = useCallback(() => {
    toast.error('Workspace selection required. Please select a workspace.');
    // Could redirect to workspace picker here if needed
  }, []);

  useEffect(() => {
    if (projectId && workspaceId) {
      loadTasks();
      loadWorkspaceMembers();
    }
  }, [projectId, workspaceId, activeWorkspaceId]);

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
      const result = await listTasks({ projectId });
      const items = Array.isArray(result.items) ? result.items : [];
      setTasks(items);
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

      // BULK STATUS: NOT optimistic due to STRICT validation
      // Server may reject entire batch if any transition is invalid
      // For non-status actions: also keep non-optimistic for simplicity (MVP)
      const results = await Promise.allSettled(
        ids.map((id) => updateTask(id, patch as any))
      );

      const fulfilled = results.filter((r): r is PromiseFulfilledResult<WorkTask> => r.status === 'fulfilled');
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      // Apply successful updates to local state (in-place, no full reload)
      if (fulfilled.length > 0) {
        const updatedMap = new Map(fulfilled.map(r => [r.value.id, r.value]));
        setTasks(prev => prev.map(t => updatedMap.get(t.id) || t));
        toast.success(`Updated ${fulfilled.length} task${fulfilled.length > 1 ? 's' : ''}`);

        // Invalidate stats cache (only when changes applied) and dispatch event
        invalidateStatsCache(projectId);
        window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
      }
      // Note: Do NOT invalidate stats when all rejected (VALIDATION_ERROR)

      // Handle errors with detailed messages
      if (rejected.length > 0) {
        const firstError = rejected[0]?.reason;
        const { code, message, invalidTransitions } = getErrorDetails(firstError);

        if (code === ERR_VALIDATION_ERROR && invalidTransitions?.length) {
          // Show first 3 invalid transitions
          const details = invalidTransitions.slice(0, 3)
            .map(t => `${t.from} → ${t.to}`)
            .join(', ');
          toast.error(`${rejected.length} task${rejected.length > 1 ? 's' : ''} failed: ${details}`);
        } else if (code === ERR_WORKSPACE_REQUIRED) {
          handleWorkspaceError();
        } else {
          toast.error(`${rejected.length} task${rejected.length > 1 ? 's' : ''} failed: ${message}`);
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
      }

      if (failedIds.size > 0) {
        // FIX #2: Restore from snapshot, keeping original order, filtering out succeeded
        setTasks(snapshotBeforeDelete.filter(t => !succeededIds.has(t.id)));

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
      // RISK #1 MITIGATION: Use high limit to get all deleted tasks for this project.
      // Client-side filtering means we need all rows. If backend paginates,
      // we might miss some deleted tasks. Using limit=500 as reasonable max for MVP.
      // TODO: Add server-side deletedOnly=true support for proper pagination.
      const result = await listTasks({ projectId, includeDeleted: true, limit: 500 });
      // Harden: ensure items is an array before filtering
      const items = Array.isArray(result.items) ? result.items : [];
      // Filter to only deleted tasks (deletedAt is not null)
      const deleted = items.filter(t => t.deletedAt !== null);
      setDeletedTasks(deleted);
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

  // Parse highlighted task ID once (avoid re-parsing per row)
  const highlightedTaskId = new URLSearchParams(window.location.search).get('taskId');

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
        <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
        {canEdit && (
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-sm"
          >
            + New Task
          </Button>
        )}
      </div>

      {/* Create Task Form */}
      {showCreateForm && canEdit && (
        <TaskCreateForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateForm(false)}
          creating={creating}
          workspaceMembers={workspaceMembers}
        />
      )}

      {/* Bulk Action Bar */}
      {selectedTaskIds.size > 0 && canEdit && (
        <TaskBulkActions
          selectedCount={selectedTaskIds.size}
          bulkAction={bulkAction}
          bulkStatus={bulkStatus}
          bulkAssigneeId={bulkAssigneeId}
          bulkDueDate={bulkDueDate}
          bulkProcessing={bulkProcessing}
          loading={loading}
          isAdmin={isAdmin}
          workspaceMembers={workspaceMembers}
          onSetBulkAction={setBulkAction}
          onSetBulkStatus={setBulkStatus}
          onSetBulkAssigneeId={setBulkAssigneeId}
          onSetBulkDueDate={setBulkDueDate}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
          onClearSelection={clearSelection}
        />
      )}

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks yet</p>
          {canEdit && (
            <Button onClick={() => setShowCreateForm(true)} variant="ghost" className="mt-4">
              Create first task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              tasks={tasks}
              isHighlighted={highlightedTaskId === task.id}
              isSelected={selectedTaskIds.has(task.id)}
              canEdit={canEdit}
              loading={loading}
              showComments={!!showComments[task.id]}
              showActivity={!!showActivity[task.id]}
              showDeps={!!showDeps[task.id]}
              showAC={!!showAC[task.id]}
              comments={comments[task.id] || []}
              activities={activities[task.id] || []}
              deps={deps[task.id]}
              newComment={newComment[task.id] || ''}
              postingComment={!!postingComment[task.id]}
              depSearch={depSearch[task.id] || ''}
              addingDep={!!addingDep[task.id]}
              getUserLabel={getUserLabel}
              formatActivity={formatActivity}
              onStatusChange={handleStatusChange}
              onToggleSelection={toggleTaskSelection}
              onToggleComments={toggleComments}
              onToggleActivity={toggleActivity}
              onToggleDeps={toggleDeps}
              onToggleAC={toggleAC}
              onNewCommentChange={(id, val) => setNewComment(prev => ({ ...prev, [id]: val }))}
              onAddComment={handleAddComment}
              onDepSearchChange={(id, val) => setDepSearch(prev => ({ ...prev, [id]: val }))}
              onAddDep={handleAddDep}
              onRemoveDep={handleRemoveDep}
              onSaveAC={handleSaveAC}
            />
          ))}
        </div>
      )}

      {/* ADMIN ONLY: Recently Deleted Tasks Panel */}
      {isAdmin && (
        <TaskDeletedPanel
          showPanel={showDeletedPanel}
          deletedTasks={deletedTasks}
          deletedLoading={deletedLoading}
          restoringTaskIds={restoringTaskIds}
          onTogglePanel={() => setShowDeletedPanel(prev => !prev)}
          onRestore={handleRestoreTask}
        />
      )}
    </div>
  );
}
