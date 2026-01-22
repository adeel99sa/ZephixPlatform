import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import { usePhaseUpdate } from '@/features/work-management/hooks/usePhaseUpdate';
import { AckRequiredModal } from '@/features/work-management/components/AckRequiredModal';

interface WorkPhase {
  phaseId: string;
  name: string;
  sortOrder: number;
  isMilestone: boolean;
  isLocked: boolean;
  dueDate?: string;
  tasks: WorkTask[];
}

interface WorkTask {
  taskId: string;
  name: string;
  status: string;
  rank: number;
  ownerUserId?: string;
  dueDate?: string;
}

interface ProjectPlan {
  projectId: string;
  projectName: string;
  projectState: string;
  structureLocked: boolean;
  phases: WorkPhase[];
}

export function ProjectPlanView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { isReadOnly, canWrite } = useWorkspaceRole(workspaceId);
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');

  const {
    updatePhase: updatePhaseHook,
    loading: updateLoading,
    error: updateError,
    ackRequired,
    confirmAck,
  } = usePhaseUpdate(
    (updatedPhase) => {
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
    setEditingPhaseId(phase.phaseId);
    setNewDueDate(phase.dueDate ? phase.dueDate.split('T')[0] : '');
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{plan.projectName}</h1>
        <p className="text-gray-600 mt-1">Work Plan</p>
      </div>

      {/* Phases */}
      <div className="space-y-4">
        {plan.phases.map((phase) => (
          <div key={phase.phaseId} className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Patch 4: Phase row with Due date column */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                {phase.isMilestone && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Milestone
                  </span>
                )}
                {phase.isLocked && (
                  <span className="text-xs text-gray-500">Locked</span>
                )}
              </div>

              {/* Patch 4: Due date column */}
              <div className="flex items-center gap-2 min-w-[200px] justify-end">
                {phase.isMilestone ? (
                  <>
                    {editingPhaseId === phase.phaseId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={newDueDate}
                          onChange={(e) => setNewDueDate(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                          disabled={updateLoading}
                        />
                        <button
                          onClick={() => handleSubmitEdit(phase.phaseId)}
                          disabled={updateLoading || !newDueDate}
                          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updateLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={updateLoading}
                          className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        {/* Patch 4: Edit control - only for milestone, locked, ACTIVE, canWrite, and has dueDate */}
                        {canWrite && plan.projectState === 'ACTIVE' && phase.isLocked && phase.dueDate && (
                          <button
                            onClick={() => handleStartEdit(phase)}
                            disabled={updateLoading}
                            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
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

              {!isReadOnly && phase.tasks.length === 0 && (
                <button className="text-sm text-blue-600 hover:text-blue-800 ml-4">
                  Add task
                </button>
              )}
            </div>

            {phase.tasks.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">
                {PHASE5_1_COPY.NO_TASKS_IN_PHASE}
              </div>
            ) : (
              <div className="space-y-2">
                {phase.tasks.map((task) => (
                  <div key={task.taskId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{task.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Acknowledgement Modal */}
      <AckRequiredModal
        open={ackRequired !== null}
        response={ackRequired}
        onConfirm={() => {
          if (ackRequired) {
            confirmAck();
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
    </div>
  );
}

