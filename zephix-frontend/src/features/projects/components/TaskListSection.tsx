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
 */
import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import { isAdminUser, isGuestUser } from '@/utils/roles';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';

type WorkItemStatus = 'todo' | 'in_progress' | 'done';

type WorkItem = {
  id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  assigneeId?: string;
  assignee?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

type WorkItemComment = {
  id: string;
  body: string;
  createdBy: string;
  createdByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
};

type WorkItemActivity = {
  id: string;
  type: string;
  actorUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  payload?: Record<string, any>;
  createdAt: string;
};

interface Props {
  projectId: string;
  workspaceId: string;
}

export function TaskListSection({ projectId, workspaceId }: Props) {
  const { user } = useAuth();
  const { isReadOnly } = useWorkspaceRole(workspaceId);
  const { getWorkspaceMembers, setWorkspaceMembers } = useWorkspaceStore();
  const [tasks, setTasks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Record<string, WorkItemComment[]>>({});
  const [activities, setActivities] = useState<Record<string, WorkItemActivity[]>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [showActivity, setShowActivity] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});

  // PHASE 7 MODULE 7.4: Bulk actions state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'status' | 'assign' | 'dueDate' | 'clearDueDate' | 'unassign' | 'delete' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<WorkItemStatus>('todo');
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('');
  const [bulkDueDate, setBulkDueDate] = useState<string>('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // PHASE 7 MODULE 7.1 FIX: Use cached members
  const cachedMembers = workspaceId ? getWorkspaceMembers(workspaceId) : null;
  const [workspaceMembers, setWorkspaceMembersState] = useState(cachedMembers || []);

  // PHASE 7 MODULE 7.1 FIX: Consistent role checks
  const isAdmin = isAdminUser(user);
  const isGuest = isGuestUser(user);
  const canEdit = !isReadOnly && !isGuest;

  useEffect(() => {
    if (projectId && workspaceId) {
      loadTasks();
      loadWorkspaceMembers();
    }
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
      setWorkspaceMembers(workspaceId, members); // Cache it
      setWorkspaceMembersState(members);
    } catch (error) {
      console.error('Failed to load workspace members:', error);
    }
  }

  async function loadTasks() {
    if (!projectId || !workspaceId) return;

    setLoading(true);
    try {
      // PHASE 7 MODULE 7.1 FIX: Explicit scoping with projectId and workspaceId
      const response = await api.get<WorkItem[]>(
        `/work-items?projectId=${projectId}&workspaceId=${workspaceId}`
      );
      // Backend sorts by dueDate ASC, createdAt DESC
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function loadComments(taskId: string) {
    try {
      const response = await api.get<WorkItemComment[]>(
        `/work-items/${taskId}/comments`
      );
      setComments(prev => ({ ...prev, [taskId]: response.data || [] }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }

  async function loadActivities(taskId: string) {
    try {
      const response = await api.get<WorkItemActivity[]>(
        `/work-items/${taskId}/activities`
      );
      setActivities(prev => ({ ...prev, [taskId]: response.data || [] }));
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  }

  async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId || !workspaceId) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const assigneeId = formData.get('assigneeId') as string || undefined;
    const dueDate = formData.get('dueDate') as string || undefined;

    if (!title.trim()) return;

    setCreating(true);
    try {
      await api.post('/work-items', {
        workspaceId,
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId,
        dueDate: dueDate || undefined,
        status: 'todo',
      });

      toast.success('Task created');
      setShowCreateForm(false);
      e.currentTarget.reset();
      await loadTasks();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error?.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: WorkItemStatus) {
    if (!canEdit) return;

    try {
      await api.patch(`/work-items/${taskId}/status`, { status: newStatus });
      toast.success('Status updated');
      await loadTasks();
      // Reload activities to show status change
      if (activities[taskId]) {
        await loadActivities(taskId);
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error?.response?.data?.message || 'Failed to update status');
    }
  }

  async function handleAddComment(taskId: string) {
    const commentText = newComment[taskId];
    if (!commentText?.trim()) return;

    setPostingComment(prev => ({ ...prev, [taskId]: true }));
    try {
      await api.post(`/work-items/${taskId}/comments`, {
        body: commentText.trim(),
      });

      toast.success('Comment added');
      setNewComment(prev => ({ ...prev, [taskId]: '' }));
      await loadComments(taskId);
      // Reload activities to show comment
      await loadActivities(taskId);
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      toast.error(error?.response?.data?.message || 'Failed to add comment');
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

  function getStatusColor(status: WorkItemStatus): string {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'done':
        return 'bg-green-100 text-green-800';
    }
  }

  // PHASE 7 MODULE 7.4: Bulk action handlers
  function toggleTaskSelection(taskId: string) {
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

    setBulkProcessing(true);
    try {
      const patch: any = {};

      if (bulkAction === 'status') {
        patch.status = bulkStatus;
      } else if (bulkAction === 'assign') {
        patch.assigneeId = bulkAssigneeId || null;
      } else if (bulkAction === 'unassign') {
        patch.assigneeId = null;
      } else if (bulkAction === 'dueDate') {
        patch.dueDate = bulkDueDate || null;
      } else if (bulkAction === 'clearDueDate') {
        patch.dueDate = null;
      }

      const response = await api.post('/work-items/bulk/update', {
        workspaceId,
        projectId,
        ids: Array.from(selectedTaskIds),
        patch,
      });

      const result = response.data;
      const successCount = result.updatedCount || 0;
      const skippedCount = result.skippedCount || 0;
      const errorCount = result.errors?.length || 0;

      if (successCount > 0) {
        toast.success(`Updated ${successCount} task${successCount > 1 ? 's' : ''}`);
      }
      if (skippedCount > 0) {
        toast.warning(`${skippedCount} task${skippedCount > 1 ? 's' : ''} skipped`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
      }

      // Keep only skipped items selected
      const skippedIds = new Set(result.errors?.map((e: any) => e.id) || []);
      setSelectedTaskIds(skippedIds);
      setBulkAction(null);

      await loadTasks();
    } catch (error: any) {
      console.error('Bulk update failed:', error);
      toast.error(error?.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedTaskIds.size === 0) return;

    if (!confirm(`Delete ${selectedTaskIds.size} task${selectedTaskIds.size > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setBulkProcessing(true);
    try {
      const response = await api.post('/work-items/bulk/delete', {
        workspaceId,
        projectId,
        ids: Array.from(selectedTaskIds),
      });

      const result = response.data;
      const successCount = result.updatedCount || 0;
      const skippedCount = result.skippedCount || 0;

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} task${successCount > 1 ? 's' : ''}`);
      }
      if (skippedCount > 0) {
        toast.warning(`${skippedCount} task${skippedCount > 1 ? 's' : ''} skipped`);
      }

      clearSelection();
      await loadTasks();
    } catch (error: any) {
      console.error('Bulk delete failed:', error);
      toast.error(error?.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkProcessing(false);
    }
  }

  function formatActivity(activity: WorkItemActivity): string {
    const actor = activity.actorUser
      ? `${activity.actorUser.firstName || ''} ${activity.actorUser.lastName || ''}`.trim() || activity.actorUser.email
      : 'Someone';

    switch (activity.type) {
      case 'created':
        return `${actor} created this task`;
      case 'status_changed':
        const from = activity.payload?.from || 'unknown';
        const to = activity.payload?.to || 'unknown';
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
                  {workspaceMembers.map((member) => {
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
                variant="outline"
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
                  variant="outline"
                  size="sm"
                  disabled={bulkProcessing}
                >
                  Change Status
                </Button>
                <Button
                  onClick={() => setBulkAction('assign')}
                  variant="outline"
                  size="sm"
                  disabled={bulkProcessing}
                >
                  Assign To
                </Button>
                <Button
                  onClick={() => setBulkAction('dueDate')}
                  variant="outline"
                  size="sm"
                  disabled={bulkProcessing}
                >
                  Set Due Date
                </Button>
                <Button
                  onClick={() => setBulkAction('clearDueDate')}
                  variant="outline"
                  size="sm"
                  disabled={bulkProcessing}
                >
                  Clear Due Date
                </Button>
                <Button
                  onClick={() => setBulkAction('unassign')}
                  variant="outline"
                  size="sm"
                  disabled={bulkProcessing}
                >
                  Unassign
                </Button>
                {isAdmin && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="outline"
                    size="sm"
                    disabled={bulkProcessing}
                    className="text-red-600 border-red-300 hover:bg-red-50"
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
                  onChange={(e) => setBulkStatus(e.target.value as WorkItemStatus)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <Button onClick={handleBulkUpdate} size="sm" disabled={bulkProcessing}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="outline" size="sm">
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
                  {workspaceMembers.map((member) => {
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
                <Button onClick={handleBulkUpdate} size="sm" disabled={bulkProcessing}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="outline" size="sm">
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
                <Button onClick={handleBulkUpdate} size="sm" disabled={bulkProcessing}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            )}
            {(bulkAction === 'clearDueDate' || bulkAction === 'unassign') && (
              <div className="flex items-center gap-2">
                <Button onClick={handleBulkUpdate} size="sm" disabled={bulkProcessing}>
                  {bulkProcessing ? 'Updating...' : 'Update'}
                </Button>
                <Button onClick={() => setBulkAction(null)} variant="outline" size="sm">
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
              variant="outline"
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
                    className="mt-1 mr-3 w-4 h-4 rounded border-gray-300"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {canEdit ? (
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as WorkItemStatus)}
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)} border-0`}
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.assignee && (
                      <span>Assigned to: {task.assignee.firstName || task.assignee.email}</span>
                    )}
                    {task.dueDate && (
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments and Activity Toggles */}
              <div className="mt-3 flex gap-2">
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
              </div>

              {/* Comments Panel */}
              {showComments[task.id] && (
                <div className="mt-3 pt-3 border-t">
                  <h4 className="text-sm font-medium mb-2">Comments</h4>
                  <div className="space-y-2 mb-3">
                    {comments[task.id]?.map((comment) => (
                      <div key={comment.id} className="text-sm bg-gray-50 p-2 rounded">
                        <div className="font-medium text-gray-700">
                          {comment.createdByUser?.firstName || comment.createdByUser?.email || 'Unknown'}
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
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
