import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  RotateCcw, 
  MoreVertical, 
  AlertCircle,
  Plus,
  Check,
  X,
  Edit2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useAuth } from '@/state/AuthContext';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import { usePhaseUpdate } from '@/features/work-management/hooks/usePhaseUpdate';
import { AckRequiredModal } from '@/features/work-management/components/AckRequiredModal';
import {
  createTask,
  updateTask,
  deleteTask,
  listDeletedPhases,
  deletePhase,
  restorePhase,
  createPhase,
  updatePhase as updatePhaseApi,
  getAllowedTransitions,
  type WorkPhase,
  type WorkPlanTask,
  type ProjectPlan,
  type DeletedPhase,
  type WorkTaskStatus,
} from '@/features/work-management/workTasks.api';
import { invalidateStatsCache } from '@/features/work-management/workTasks.stats.api';
import { track } from '@/lib/telemetry';

export function ProjectPlanView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { canWrite } = useWorkspaceRole(workspaceId);
  const { user } = useAuth();
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [addingPhaseId, setAddingPhaseId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState(false);

  // --- Deleted phases panel state ---
  const [deletedPanelOpen, setDeletedPanelOpen] = useState(false);
  const [deletedPhases, setDeletedPhases] = useState<DeletedPhase[]>([]);
  const [deletedPhasesLoading, setDeletedPhasesLoading] = useState(false);
  const [deletedPhasesError, setDeletedPhasesError] = useState<string | null>(null);
  const [restoringPhaseIds, setRestoringPhaseIds] = useState<Set<string>>(new Set());
  const [deletingPhaseId, setDeletingPhaseId] = useState<string | null>(null);
  const [confirmDeletePhaseId, setConfirmDeletePhaseId] = useState<string | null>(null);
  const [phaseMenuOpenId, setPhaseMenuOpenId] = useState<string | null>(null);
  const loadDeletedPhasesRef = useRef(false);

  // --- Phase collapse state ---
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

  // --- Add phase inline state ---
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [creatingPhase, setCreatingPhase] = useState(false);

  // --- Rename phase inline state ---
  const [renamingPhaseId, setRenamingPhaseId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // --- Inline task editing state ---
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [savingTaskTitle, setSavingTaskTitle] = useState(false);

  // --- Status change state ---
  const [changingStatusTaskId, setChangingStatusTaskId] = useState<string | null>(null);

  // --- Delete task state ---
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [taskMenuOpenId, setTaskMenuOpenId] = useState<string | null>(null);

  // --- Rollback refs for optimistic updates ---
  const rollbackTasks = useRef<Map<string, WorkPlanTask>>(new Map());
  
  // Check if user is admin (can see deleted phases panel)
  const isAdmin = user?.platformRole === 'ADMIN';

  // --- Helper: emit plan:changed event ---
  const emitPlanChanged = useCallback(() => {
    if (projectId) {
      window.dispatchEvent(new CustomEvent('plan:changed', { detail: { projectId } }));
    }
  }, [projectId]);

  // --- Helper: emit task:changed event ---
  const emitTaskChanged = useCallback(() => {
    if (projectId) {
      window.dispatchEvent(new CustomEvent('task:changed', { detail: { projectId } }));
    }
  }, [projectId]);

  const {
    updatePhase: updatePhaseHook,
    loading: updateLoading,
    error: updateError,
    ackRequired,
    confirmAck,
  } = usePhaseUpdate(
    (_updatedPhase) => {
      // Reload plan after successful update
      loadPlan();
      setEditingPhaseId(null);
      setNewDueDate('');
    },
    (err) => {
      // Error handling is done by the hook
      console.error('Phase update error:', err);
    }
  );

  useEffect(() => {
    if (projectId && workspaceId) {
      loadPlan();
    }
  }, [projectId, workspaceId]);

  // Listen for task:changed events (e.g., task restored from deleted panel in Tasks tab)
  useEffect(() => {
    const handleTaskChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      // Only refresh if the event is for our project
      if (detail?.projectId === projectId) {
        loadPlan();
      }
    };

    window.addEventListener('task:changed', handleTaskChanged);
    return () => {
      window.removeEventListener('task:changed', handleTaskChanged);
    };
  }, [projectId, workspaceId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/work/projects/${projectId}/plan`, {
        headers: {
          'x-workspace-id': workspaceId,
        },
      });
      setPlan(response.data.data);
    } catch (err: any) {
      const errorCode = err?.response?.data?.code;
      const errorMessage = err?.response?.data?.message;
      setError(getApiErrorMessage({ code: errorCode, message: errorMessage }));
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (phase: WorkPhase) => {
    setEditingPhaseId(phase.id);
    setNewDueDate(phase.dueDate ? (phase.dueDate.split('T')[0] ?? '') : '');
  };

  const handleCancelEdit = () => {
    setEditingPhaseId(null);
    setNewDueDate('');
  };

  const handleSubmitEdit = async (phaseId: string) => {
    if (!newDueDate) {
      return;
    }
    // Send date as ISO string (backend expects ISO format)
    const isoDate = new Date(newDueDate + 'T00:00:00').toISOString();
    await updatePhaseHook(phaseId, { dueDate: isoDate });
  };

  const handleStartAddTask = (phaseId: string) => {
    setAddingPhaseId(phaseId);
    setNewTaskTitle('');
  };

  const handleCancelAddTask = () => {
    setAddingPhaseId(null);
    setNewTaskTitle('');
  };

  const handleCreateTask = async (phaseId: string | null) => {
    if (!projectId) return;
    if (!workspaceId) {
      toast.error('Active workspace required');
      return;
    }
    if (!newTaskTitle.trim()) return;

    setCreatingTask(true);

    // Optimistic insert with temp ID
    const tempId = `temp-${Date.now()}`;
    const tempTask: WorkPlanTask = {
      id: tempId,
      title: newTaskTitle.trim(),
      status: 'TODO',
      ownerId: null,
      dueDate: null,
    };

    // Insert optimistically
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase) => {
          if (phase.id === phaseId) {
            return { ...phase, tasks: [...phase.tasks, tempTask] };
          }
          return phase;
        }),
      };
    });

    const titleToSave = newTaskTitle.trim();
    handleCancelAddTask();

    try {
      const taskInput = {
        projectId,
        title: titleToSave,
        ...(phaseId ? { phaseId } : {}),
      };
      const created = await createTask(taskInput);

      // Replace temp task with real task
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.map((t) =>
              t.id === tempId
                ? {
                    id: created.id,
                    title: created.title,
                    status: created.status,
                    ownerId: created.assigneeUserId,
                    dueDate: created.dueDate,
                  }
                : t
            ),
          })),
        };
      });

      if (projectId) {
        invalidateStatsCache(projectId);
      }
      emitTaskChanged();
      emitPlanChanged();
      toast.success('Task created');

      // Activation telemetry: fire once for the activation project, then clear marker
      try {
        const activationProject = localStorage.getItem('zephix_activation_project');
        if (activationProject === projectId) {
          track('activation_first_task_created', {
            organizationId: user?.organizationId,
            workspaceId,
            projectId,
            taskId: created.id,
          });
          // Auto-dismiss the overlay after first task
          localStorage.setItem('zephix_activation_hint_dismissed', 'true');
          localStorage.removeItem('zephix_activation_project');
        }
      } catch {
        // ignore localStorage errors
      }
    } catch (err: any) {
      // Remove temp task on error
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.filter((t) => t.id !== tempId),
          })),
        };
      });
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      toast.error(getApiErrorMessage({ code, message }) || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  // --- Phase collapse handlers ---
  const togglePhaseCollapse = useCallback((phaseId: string) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }, []);

  // --- Add phase handler ---
  const handleCreatePhase = async () => {
    if (!projectId || !workspaceId) return;
    if (!newPhaseName.trim()) return;

    setCreatingPhase(true);
    try {
      await createPhase({
        projectId,
        name: newPhaseName.trim(),
      });
      setNewPhaseName('');
      setShowAddPhase(false);
      await loadPlan();
      emitPlanChanged();
      toast.success('Phase created');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      toast.error(getApiErrorMessage({ code, message }) || 'Failed to create phase');
    } finally {
      setCreatingPhase(false);
    }
  };

  // --- Rename phase handlers ---
  const handleStartRename = (phase: WorkPhase) => {
    setRenamingPhaseId(phase.id);
    setRenameValue(phase.name);
    setPhaseMenuOpenId(null);
  };

  const handleCancelRename = () => {
    setRenamingPhaseId(null);
    setRenameValue('');
  };

  const handleSaveRename = async (phaseId: string) => {
    if (!workspaceId) return;
    if (!renameValue.trim()) return;

    setSavingRename(true);
    try {
      const result = await updatePhaseApi(phaseId, { name: renameValue.trim() });
      
      // Check for ACK_REQUIRED
      if ('code' in result && result.code === 'ACK_REQUIRED') {
        toast.info('Confirmation required for milestone phase rename');
        // TODO: Handle ACK flow - for now just notify user
        handleCancelRename();
        return;
      }

      handleCancelRename();
      await loadPlan();
      emitPlanChanged();
      toast.success('Phase renamed');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      toast.error(getApiErrorMessage({ code, message }) || 'Failed to rename phase');
    } finally {
      setSavingRename(false);
    }
  };

  // --- Inline task title edit handlers ---
  const handleStartEditTask = (task: WorkPlanTask) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setEditingTaskTitle('');
  };

  const handleSaveTaskTitle = async (taskId: string) => {
    if (!workspaceId) return;
    if (!editingTaskTitle.trim()) return;

    setSavingTaskTitle(true);
    
    // Optimistic update
    const originalTask = plan?.phases.flatMap(p => p.tasks).find(t => t.id === taskId);
    if (originalTask) {
      rollbackTasks.current.set(taskId, { ...originalTask });
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.map((t) =>
              t.id === taskId ? { ...t, title: editingTaskTitle.trim() } : t
            ),
          })),
        };
      });
    }

    try {
      await updateTask(taskId, { title: editingTaskTitle.trim() });
      rollbackTasks.current.delete(taskId);
      handleCancelEditTask();
      emitTaskChanged();
      emitPlanChanged();
    } catch (err: any) {
      // Rollback
      const rollback = rollbackTasks.current.get(taskId);
      if (rollback) {
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phases: prev.phases.map((phase) => ({
              ...phase,
              tasks: phase.tasks.map((t) => (t.id === taskId ? rollback : t)),
            })),
          };
        });
        rollbackTasks.current.delete(taskId);
      }
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      toast.error(getApiErrorMessage({ code, message }) || 'Failed to update task');
    } finally {
      setSavingTaskTitle(false);
    }
  };

  // --- Status change handler ---
  const handleStatusChange = async (taskId: string, newStatus: WorkTaskStatus) => {
    if (!workspaceId) return;
    
    const task = plan?.phases.flatMap(p => p.tasks).find(t => t.id === taskId);
    if (!task) return;

    const prevStatus = task.status;
    setChangingStatusTaskId(taskId);
    
    // Optimistic update
    rollbackTasks.current.set(taskId, { ...task });
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase) => ({
          ...phase,
          tasks: phase.tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t
          ),
        })),
      };
    });

    try {
      await updateTask(taskId, { status: newStatus });
      rollbackTasks.current.delete(taskId);
      
      // Invalidate stats on DONE transition
      if (newStatus === 'DONE' && projectId) {
        invalidateStatsCache(projectId);
      }
      
      emitTaskChanged();
      emitPlanChanged();
    } catch (err: any) {
      // Rollback
      const rollback = rollbackTasks.current.get(taskId);
      if (rollback) {
        setPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            phases: prev.phases.map((phase) => ({
              ...phase,
              tasks: phase.tasks.map((t) => (t.id === taskId ? rollback : t)),
            })),
          };
        });
        rollbackTasks.current.delete(taskId);
      }
      
      const code = err?.response?.data?.code;
      if (code === 'INVALID_STATUS_TRANSITION') {
        toast.error(`Cannot change from ${prevStatus} to ${newStatus}`);
      } else {
        const message = err?.response?.data?.message;
        toast.error(getApiErrorMessage({ code, message }) || 'Failed to update status');
      }
    } finally {
      setChangingStatusTaskId(null);
    }
  };

  // --- Delete task handler ---
  const handleDeleteTask = async (taskId: string) => {
    if (!workspaceId || !projectId) return;

    setDeletingTaskId(taskId);
    setConfirmDeleteTaskId(null);
    setTaskMenuOpenId(null);

    try {
      await deleteTask(taskId);
      
      // Remove from local state
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.filter((t) => t.id !== taskId),
          })),
        };
      });

      invalidateStatsCache(projectId);
      emitTaskChanged();
      emitPlanChanged();
      toast.success('Task deleted');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      toast.error(getApiErrorMessage({ code, message }) || 'Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  // --- Deleted phases handlers ---

  /**
   * Load deleted phases for the current project.
   * Uses in-flight guard to prevent duplicate calls.
   */
  const loadDeletedPhases = useCallback(async () => {
    if (!projectId || !workspaceId) return;
    if (loadDeletedPhasesRef.current) return; // in-flight guard

    loadDeletedPhasesRef.current = true;
    setDeletedPhasesLoading(true);
    setDeletedPhasesError(null);

    try {
      const phases = await listDeletedPhases(projectId);
      setDeletedPhases(phases);
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      if (code === 'WORKSPACE_REQUIRED') {
        setDeletedPhasesError('Workspace required');
      } else {
        setDeletedPhasesError(err?.response?.data?.message || err?.message || 'Failed to load deleted phases');
      }
    } finally {
      setDeletedPhasesLoading(false);
      loadDeletedPhasesRef.current = false;
    }
  }, [projectId, workspaceId]);

  // Reset deleted phases when projectId changes
  useEffect(() => {
    if (deletedPanelOpen) {
      setDeletedPhases([]);
      loadDeletedPhases();
    }
  }, [projectId, deletedPanelOpen, loadDeletedPhases]);

  /**
   * Toggle deleted phases panel
   */
  const handleToggleDeletedPanel = () => {
    const opening = !deletedPanelOpen;
    setDeletedPanelOpen(opening);
    if (opening && deletedPhases.length === 0) {
      loadDeletedPhases();
    }
  };

  /**
   * Restore a deleted phase.
   */
  const handleRestorePhase = async (phaseId: string) => {
    if (!workspaceId) return;

    setRestoringPhaseIds((prev) => new Set(prev).add(phaseId));

    try {
      await restorePhase(phaseId);
      
      // Remove from deleted list using functional update
      setDeletedPhases((prev) => prev.filter((p) => p.id !== phaseId));
      
      // Refresh plan
      await loadPlan();
      
      // Dispatch plan:changed event
      window.dispatchEvent(new CustomEvent('plan:changed', { detail: { projectId } }));
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      
      if (code === 'WORKSPACE_REQUIRED') {
        setDeletedPhasesError('Workspace required');
      } else if (code === 'PHASE_NOT_FOUND') {
        // Remove from list silently (phase no longer exists)
        setDeletedPhases((prev) => prev.filter((p) => p.id !== phaseId));
      } else if (code === 'PHASE_NOT_DELETED') {
        // Treat as success - phase is already active, remove from list
        setDeletedPhases((prev) => prev.filter((p) => p.id !== phaseId));
        await loadPlan();
      } else {
        setDeletedPhasesError(err?.response?.data?.message || err?.message || 'Failed to restore phase');
      }
    } finally {
      setRestoringPhaseIds((prev) => {
        const next = new Set(prev);
        next.delete(phaseId);
        return next;
      });
    }
  };

  /**
   * Delete a phase (soft delete).
   */
  const handleDeletePhase = async (phaseId: string) => {
    if (!workspaceId) return;

    setDeletingPhaseId(phaseId);
    setConfirmDeletePhaseId(null);
    setPhaseMenuOpenId(null);

    try {
      await deletePhase(phaseId);
      
      // Refresh plan
      await loadPlan();
      
      // If deleted panel is open, refresh it
      if (deletedPanelOpen) {
        await loadDeletedPhases();
      }
      
      // Dispatch plan:changed event
      window.dispatchEvent(new CustomEvent('plan:changed', { detail: { projectId } }));
    } catch (err: any) {
      const code = err?.code || err?.response?.data?.code;
      if (code === 'WORKSPACE_REQUIRED') {
        setError('Workspace required');
      } else {
        setError(err?.response?.data?.message || err?.message || 'Failed to delete phase');
      }
    } finally {
      setDeletingPhaseId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {/* Skeleton for header */}
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          {/* Skeleton for phases */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-3 animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{PHASE5_1_COPY.NO_PHASES_EXIST}</h2>
          {canWrite && (
            <button
              onClick={() => navigate('/templates')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Use template
            </button>
          )}
        </div>
      </div>
    );
  }

  if (plan.phases.length === 0) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{plan.projectName}</h1>
          <p className="text-gray-600 mt-1">Work Plan</p>
        </div>

        {/* Add phase button for empty plan */}
        {canWrite && !plan.structureLocked && (
          <div className="flex gap-2">
            {showAddPhase ? (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3 w-full">
                <input
                  type="text"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="Phase name"
                  className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5"
                  disabled={creatingPhase}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePhase();
                    if (e.key === 'Escape') { setShowAddPhase(false); setNewPhaseName(''); }
                  }}
                />
                <button
                  onClick={handleCreatePhase}
                  disabled={creatingPhase || !newPhaseName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {creatingPhase ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => { setShowAddPhase(false); setNewPhaseName(''); }}
                  disabled={creatingPhase}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddPhase(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Add phase
              </button>
            )}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{PHASE5_1_COPY.NO_PHASES_EXIST}</h2>
          {canWrite && (
            <button
              onClick={() => navigate('/templates')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Use template
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{plan.projectName}</h1>
        <p className="text-gray-600 mt-1">Work Plan</p>
      </div>

      {/* Add phase button */}
      {canWrite && !plan.structureLocked && (
        <div className="flex gap-2">
          {showAddPhase ? (
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3 w-full max-w-xl">
              <input
                type="text"
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                placeholder="Phase name"
                className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5"
                disabled={creatingPhase}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePhase();
                  if (e.key === 'Escape') { setShowAddPhase(false); setNewPhaseName(''); }
                }}
              />
              <button
                onClick={handleCreatePhase}
                disabled={creatingPhase || !newPhaseName.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {creatingPhase ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => { setShowAddPhase(false); setNewPhaseName(''); }}
                disabled={creatingPhase}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddPhase(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Add phase
            </button>
          )}
        </div>
      )}

      {/* Phases */}
      <div className="space-y-4">
        {plan.phases.map((phase) => {
          const isCollapsed = collapsedPhases.has(phase.id);

          return (
            <div key={phase.id} className="bg-white border border-gray-200 rounded-lg">
              {/* Phase header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 flex-1">
                  {/* Drag handle - only show if plan is not locked and user can write */}
                  {canWrite && !plan.structureLocked && plan.projectState !== 'ACTIVE' && plan.projectState !== 'COMPLETED' && (
                    <div 
                      className="p-1 cursor-grab text-gray-400 hover:text-gray-600"
                      title="Drag to reorder phases"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}

                  {/* Collapse toggle */}
                  <button
                    onClick={() => togglePhaseCollapse(phase.id)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>

                  {/* Phase name - inline rename if editing */}
                  {renamingPhaseId === phase.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="text-lg font-semibold border border-gray-300 rounded px-2 py-1 flex-1 max-w-xs"
                        autoFocus
                        disabled={savingRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(phase.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        onBlur={() => handleSaveRename(phase.id)}
                      />
                      {savingRename && <span className="text-sm text-gray-500">Saving...</span>}
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                  )}

                  {/* Badges */}
                  {phase.isMilestone && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Milestone
                    </span>
                  )}
                  {phase.isLocked && (
                    <span className="text-xs text-gray-500">Locked</span>
                  )}
                  
                  {/* Task count */}
                  <span className="text-xs text-gray-500">
                    {phase.tasks.length} {phase.tasks.length === 1 ? 'task' : 'tasks'}
                  </span>

                  {/* Phase actions menu */}
                  {canWrite && (
                    <div className="relative ml-2">
                      <button
                        onClick={() => setPhaseMenuOpenId(phaseMenuOpenId === phase.id ? null : phase.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        disabled={deletingPhaseId === phase.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {phaseMenuOpenId === phase.id && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[160px]">
                          <button
                            onClick={() => handleStartRename(phase)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="h-4 w-4" />
                            Rename phase
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setConfirmDeletePhaseId(phase.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete phase
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Due date column */}
                <div className="flex items-center gap-2 min-w-[200px] justify-end">
                  {phase.isMilestone ? (
                    <>
                      {editingPhaseId === phase.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                            disabled={updateLoading}
                          />
                          <button
                            onClick={() => handleSubmitEdit(phase.id)}
                            disabled={updateLoading || !newDueDate}
                            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {updateLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={updateLoading}
                            className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {phase.dueDate ? (
                            <span className="text-sm text-gray-600">
                              {new Date(phase.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                          {canWrite && plan.projectState === 'ACTIVE' && phase.isLocked && phase.dueDate && (
                            <button
                              onClick={() => handleStartEdit(phase)}
                              disabled={updateLoading}
                              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 ml-2"
                            >
                              Edit date
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </div>
              </div>

              {/* Phase content (tasks) - collapsible */}
              {!isCollapsed && (
                <div className="p-4">
                  {phase.tasks.length === 0 ? (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      {PHASE5_1_COPY.NO_TASKS_IN_PHASE}
                      {canWrite && (
                        <div className="mt-2">
                          {addingPhaseId === phase.id ? (
                            <div className="flex items-center gap-2 justify-center">
                              <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                placeholder="Task title"
                                disabled={creatingTask}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateTask(phase.id);
                                  if (e.key === 'Escape') handleCancelAddTask();
                                }}
                              />
                              <button
                                onClick={() => handleCreateTask(phase.id)}
                                disabled={creatingTask || !newTaskTitle.trim()}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                {creatingTask ? 'Adding...' : 'Add'}
                              </button>
                              <button
                                onClick={handleCancelAddTask}
                                disabled={creatingTask}
                                className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartAddTask(phase.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Add task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {phase.tasks.map((task) => {
                        const taskAllowedTransitions = getAllowedTransitions(task.status);
                        const isEditingThis = editingTaskId === task.id;
                        
                        return (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                            <div className="flex-1 min-w-0">
                              {/* Task title - inline edit */}
                              {isEditingThis ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingTaskTitle}
                                    onChange={(e) => setEditingTaskTitle(e.target.value)}
                                    className="text-sm font-medium border border-gray-300 rounded px-2 py-1 flex-1"
                                    autoFocus
                                    disabled={savingTaskTitle}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveTaskTitle(task.id);
                                      if (e.key === 'Escape') handleCancelEditTask();
                                    }}
                                    onBlur={() => handleSaveTaskTitle(task.id)}
                                  />
                                  {savingTaskTitle && <span className="text-xs text-gray-500">Saving...</span>}
                                </div>
                              ) : (
                                <p 
                                  className={`text-sm font-medium text-gray-900 truncate ${canWrite ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                  onClick={() => canWrite && handleStartEditTask(task)}
                                >
                                  {task.title}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-3 mt-1">
                                {/* Status dropdown with allowed transitions */}
                                {canWrite && taskAllowedTransitions.length > 0 ? (
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value as WorkTaskStatus)}
                                    disabled={changingStatusTaskId === task.id}
                                    className={`text-xs px-2 py-0.5 rounded border-0 cursor-pointer ${
                                      task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                                      task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                      task.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                      task.status === 'IN_REVIEW' ? 'bg-purple-100 text-purple-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    <option value={task.status}>{task.status}</option>
                                    {taskAllowedTransitions.map((status) => (
                                      <option key={status} value={status}>{status}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                    task.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                    task.status === 'IN_REVIEW' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {task.status}
                                  </span>
                                )}
                                
                                {task.dueDate && (
                                  <span className="text-xs text-gray-500">
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Task actions */}
                            {isAdmin && canWrite && (
                              <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setTaskMenuOpenId(taskMenuOpenId === task.id ? null : task.id)}
                                  className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                                  disabled={deletingTaskId === task.id}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                                {taskMenuOpenId === task.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
                                    <button
                                      onClick={() => setConfirmDeleteTaskId(task.id)}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete task
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Add task button at bottom of phase */}
                      {canWrite && (
                        <div className="pt-2">
                          {addingPhaseId === phase.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                                placeholder="Task title"
                                disabled={creatingTask}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateTask(phase.id);
                                  if (e.key === 'Escape') handleCancelAddTask();
                                }}
                              />
                              <button
                                onClick={() => handleCreateTask(phase.id)}
                                disabled={creatingTask || !newTaskTitle.trim()}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              >
                                {creatingTask ? 'Adding...' : 'Add'}
                              </button>
                              <button
                                onClick={handleCancelAddTask}
                                disabled={creatingTask}
                                className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartAddTask(phase.id)}
                              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
                            >
                              <Plus className="h-4 w-4" />
                              Add task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Acknowledgement Modal */}
      <AckRequiredModal
        open={ackRequired !== null}
        response={ackRequired}
        onConfirm={() => {
          if (ackRequired) {
            confirmAck('');
          }
        }}
        onCancel={() => {
          setEditingPhaseId(null);
          setNewDueDate('');
        }}
      />

      {/* Update error display */}
      {updateError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{updateError.message}</p>
        </div>
      )}

      {/* Admin-only: Recently deleted phases panel */}
      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <button
            onClick={handleToggleDeletedPanel}
            className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {deletedPanelOpen ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-700">Recently deleted phases</span>
              {deletedPhases.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {deletedPhases.length}
                </span>
              )}
            </div>
          </button>

          {deletedPanelOpen && (
            <div className="border-t border-gray-200 px-4 py-3">
              {deletedPhasesLoading && (
                <div className="flex items-center gap-2 py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                  <span className="text-sm text-gray-500">Loading...</span>
                </div>
              )}

              {deletedPhasesError && (
                <div className="flex items-center gap-2 py-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {deletedPhasesError}
                </div>
              )}

              {!deletedPhasesLoading && !deletedPhasesError && deletedPhases.length === 0 && (
                <div className="py-4 text-sm text-gray-500">
                  No deleted phases
                </div>
              )}

              {!deletedPhasesLoading && deletedPhases.length > 0 && (
                <ul className="space-y-2">
                  {deletedPhases.map((phase) => (
                    <li
                      key={phase.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{phase.name}</p>
                        {phase.deletedAt && (
                          <p className="text-xs text-gray-500">
                            Deleted {new Date(phase.deletedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRestorePhase(phase.id)}
                        disabled={restoringPhaseIds.has(phase.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className={`h-4 w-4 ${restoringPhaseIds.has(phase.id) ? 'animate-spin' : ''}`} />
                        {restoringPhaseIds.has(phase.id) ? 'Restoring...' : 'Restore'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm delete phase dialog */}
      {confirmDeletePhaseId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete phase?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will soft-delete the phase. You can restore it later from the "Recently deleted" panel.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeletePhaseId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePhase(confirmDeletePhaseId)}
                disabled={deletingPhaseId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deletingPhaseId === confirmDeletePhaseId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete task dialog */}
      {confirmDeleteTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete task?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will soft-delete the task. You can restore it later from the "Recently deleted" panel in the Tasks tab.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDeleteTaskId(null); setTaskMenuOpenId(null); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTask(confirmDeleteTaskId)}
                disabled={deletingTaskId !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {deletingTaskId === confirmDeleteTaskId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

