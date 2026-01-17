import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { PHASE5_1_COPY } from '@/constants/phase5_1.copy';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
// PHASE 6 MODULE 5: Project linking
import { ProjectLinkingSection } from '../components/ProjectLinkingSection';
// PHASE 7 MODULE 7.1: Task list
import { TaskListSection } from '../components/TaskListSection';
import { api as apiClient } from '@/lib/api';
// Commit 5: KPI Panel
import { ProjectKpiPanel } from '../components/ProjectKpiPanel';

interface NeedsAttentionItem {
  typeCode: string;
  reasonText: string;
  ownerUserId: string | null;
  nextStepCode: string;
  nextStepLabel: string;
  entityRef: {
    taskId?: string;
    phaseId?: string;
  };
  dueDate?: string;
}

interface ProjectOverview {
  projectId: string;
  projectName: string;
  projectState: string;
  structureLocked: boolean;
  startedAt: string | null;
  deliveryOwnerUserId: string | null;
  dateRange: {
    startDate: string | null;
    dueDate: string | null;
  };
  healthCode: 'HEALTHY' | 'AT_RISK' | 'BLOCKED';
  healthLabel: string;
  behindTargetDays: number | null;
  needsAttention: NeedsAttentionItem[];
  nextActions: NeedsAttentionItem[];
}

const healthColors: Record<string, string> = {
  HEALTHY: 'bg-green-100 text-green-800',
  AT_RISK: 'bg-yellow-100 text-yellow-800',
  BLOCKED: 'bg-red-100 text-red-800',
};

export const ProjectOverviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { isReadOnly, canWrite } = useWorkspaceRole(workspaceId);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [project, setProject] = useState<any>(null); // PHASE 6 MODULE 5: Full project data with programId/portfolioId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startWorkError, setStartWorkError] = useState<string | null>(null);
  const [startingWork, setStartingWork] = useState(false);

  // PHASE 7 MODULE 7.2: Handle taskId query param for navigation from My Work
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('taskId');
    if (taskId) {
      // Scroll to TaskListSection after a short delay to allow page to render
      setTimeout(() => {
        const taskSection = document.getElementById('task-list-section');
        if (taskSection) {
          taskSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight the task row
          const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
          if (taskRow) {
            taskRow.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => {
              taskRow.classList.remove('ring-2', 'ring-blue-500');
            }, 3000);
          }
        }
      }, 500);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && workspaceId) {
      loadOverview();
      loadProjectData(); // PHASE 6 MODULE 5: Load full project data
    }
  }, [projectId, workspaceId]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/work/projects/${projectId}/overview`, {
        headers: {
          'x-workspace-id': workspaceId,
        },
      });
      setOverview(response.data.data);
    } catch (err: any) {
      console.error('Failed to load project overview:', err);
      setError(err.response?.data?.message || 'Failed to load project overview');
    } finally {
      setLoading(false);
    }
  };

  // PHASE 6 MODULE 5: Load full project data with programId/portfolioId
  const loadProjectData = async () => {
    if (!workspaceId || !projectId) return;
    try {
      const response = await apiClient.get<{ data: { projects: any[] } }>(
        `/projects?workspaceId=${workspaceId}`
      );
      const projects = response.data?.projects || response.data || [];
      const currentProject = Array.isArray(projects)
        ? projects.find(p => p.id === projectId)
        : null;
      if (currentProject) {
        setProject(currentProject);
      }
    } catch (err) {
      console.warn('Failed to load project data for linking:', err);
    }
  };

  const handleStartWork = async () => {
    if (!projectId || !workspaceId) return;

    setStartingWork(true);
    setStartWorkError(null);

    try {
      const response = await api.post(`/work/projects/${projectId}/start`, {}, {
        headers: {
          'x-workspace-id': workspaceId,
        },
      });

      // Reload overview to get updated state
      await loadOverview();
    } catch (err: any) {
      const errorCode = err?.response?.data?.code;
      const errorMessage = err?.response?.data?.message;
      setStartWorkError(getApiErrorMessage({ code: errorCode, message: errorMessage }));
    } finally {
      setStartingWork(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!overview) {
    return <div>No overview data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Project Name and Open Plan Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{overview.projectName}</h1>
            <p className="text-sm text-gray-500 mt-1">Project Overview</p>
          </div>
          <button
            onClick={() => navigate(`/work/projects/${projectId}/plan`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Open Plan
          </button>
        </div>
      </div>

      {/* Start Work Section - Sprint 6 */}
      {overview.projectState === 'DRAFT' && canWrite && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">Ready to Start</h2>
              <p className="text-sm text-gray-600">Start work to lock the project structure.</p>
            </div>
            <button
              onClick={handleStartWork}
              disabled={startingWork}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startingWork ? 'Starting...' : 'Start work'}
            </button>
          </div>
          {startWorkError && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">{startWorkError}</p>
            </div>
          )}
        </div>
      )}


      {/* Health Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Project Health</h2>
        <div className="flex items-center space-x-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${healthColors[overview.healthCode]}`}
          >
            {overview.healthLabel}
          </span>
          {overview.behindTargetDays !== null && (
            <span className="text-sm text-gray-600">
              {overview.behindTargetDays} days behind target
            </span>
          )}
        </div>
      </div>

      {/* Needs Attention */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Needs Attention</h2>
        {overview.needsAttention.length > 0 ? (
          <ul className="space-y-3">
            {overview.needsAttention.map((item, index) => (
              <li key={index} className="border-l-4 border-yellow-400 pl-4 py-2">
                <p className="text-sm font-medium text-gray-900">{item.reasonText}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Action: {item.nextStepLabel}
                  {item.dueDate && ` • Due: ${new Date(item.dueDate).toLocaleDateString()}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{PHASE5_1_COPY.NO_ITEMS_NEED_ATTENTION}</p>
        )}
      </div>

      {/* Next Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Next Actions</h2>
        {overview.nextActions.length > 0 ? (
          <ul className="space-y-3">
            {overview.nextActions.map((item, index) => (
              <li key={index} className="border-l-4 border-blue-400 pl-4 py-2">
                <p className="text-sm font-medium text-gray-900">{item.reasonText}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Action: {item.nextStepLabel}
                  {item.dueDate && ` • Due: ${new Date(item.dueDate).toLocaleDateString()}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No actions required at this time.</p>
        )}
      </div>

      {/* PHASE 6 MODULE 5: Project Linking Section */}
      {project && (
        <ProjectLinkingSection
          projectId={projectId!}
          project={project}
          onUpdated={loadProjectData}
        />
      )}

      {/* PHASE 7 MODULE 7.1: Task List Section */}
      {workspaceId && (
        <TaskListSection
          projectId={projectId!}
          workspaceId={workspaceId}
        />
      )}

      {/* Commit 5: KPI Panel */}
      {workspaceId && (
        <ProjectKpiPanel
          projectId={projectId!}
          workspaceId={workspaceId}
        />
      )}

      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Project Information</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">State</dt>
            <dd className="mt-1 text-sm text-gray-900">{overview.projectState}</dd>
          </div>
          {overview.dateRange.startDate && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(overview.dateRange.startDate).toLocaleDateString()}
              </dd>
            </div>
          )}
          {overview.dateRange.dueDate && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Due Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(overview.dateRange.dueDate).toLocaleDateString()}
              </dd>
            </div>
          )}
          {overview.structureLocked && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Structure</dt>
              <dd className="mt-1 text-sm text-gray-900">Locked</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default ProjectOverviewPage;
