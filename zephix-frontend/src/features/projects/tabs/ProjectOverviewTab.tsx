/**
 * ProjectOverviewTab
 * 
 * Overview tab content for the project page.
 * Shows project health, needs attention items, next actions, and quick info.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Play, AlertCircle, CheckCircle, Clock, Calendar, Lock, Unlock } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
// PHASE 6 MODULE 5: Project linking
import { ProjectLinkingSection } from '../components/ProjectLinkingSection';
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

const healthConfig: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  HEALTHY: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  AT_RISK: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertCircle },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
};

export const ProjectOverviewTab: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeWorkspaceId: workspaceId } = useWorkspaceStore();
  const { isReadOnly, canWrite } = useWorkspaceRole(workspaceId);
  const { project, refresh: refreshProject } = useProjectContext();

  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startWorkError, setStartWorkError] = useState<string | null>(null);
  const [startingWork, setStartingWork] = useState(false);

  // Load overview data
  useEffect(() => {
    if (projectId && workspaceId) {
      loadOverview();
    }
  }, [projectId, workspaceId]);

  // Handle taskId query param for navigation from My Work
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      // Navigate to tasks tab with the taskId
      navigate(`/projects/${projectId}/tasks?taskId=${taskId}`, { replace: true });
    }
  }, [projectId, searchParams, navigate]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/work/projects/${projectId}/overview`, {
        headers: { 'x-workspace-id': workspaceId },
      });
      setOverview(response.data.data);
    } catch (err: any) {
      console.error('Failed to load project overview:', err);
      setError(err.response?.data?.message || 'Failed to load project overview');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async () => {
    if (!projectId || !workspaceId) return;

    setStartingWork(true);
    setStartWorkError(null);

    try {
      await api.post(`/work/projects/${projectId}/start`, {}, {
        headers: { 'x-workspace-id': workspaceId },
      });
      await loadOverview();
      await refreshProject();
    } catch (err: any) {
      const errorCode = err?.response?.data?.code;
      const errorMessage = err?.response?.data?.message;
      setStartWorkError(getApiErrorMessage({ code: errorCode, message: errorMessage }));
    } finally {
      setStartingWork(false);
    }
  };

  const handleOpenPlan = () => {
    navigate(`/projects/${projectId}/plan`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        title="Unable to load overview"
        description={error}
        icon={<AlertCircle className="h-12 w-12" />}
        action={
          <button
            onClick={loadOverview}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        }
      />
    );
  }

  if (!overview) {
    return (
      <EmptyState
        title="No overview data"
        description="Overview data is not available for this project."
        icon={<AlertCircle className="h-12 w-12" />}
      />
    );
  }

  const healthStyle = healthConfig[overview.healthCode] || healthConfig.HEALTHY;
  const HealthIcon = healthStyle.icon;

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleOpenPlan}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Open Plan
        </button>
        
        {overview.projectState === 'DRAFT' && canWrite && (
          <button
            onClick={handleStartWork}
            disabled={startingWork}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" />
            {startingWork ? 'Starting...' : 'Start Work'}
          </button>
        )}
      </div>

      {startWorkError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">{startWorkError}</p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Health and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Health Card */}
          <div className={`rounded-lg border p-6 ${healthStyle.bg}`}>
            <div className="flex items-center gap-3">
              <HealthIcon className={`h-8 w-8 ${healthStyle.text}`} />
              <div>
                <h3 className={`text-lg font-semibold ${healthStyle.text}`}>
                  {overview.healthLabel}
                </h3>
                {overview.behindTargetDays !== null && overview.behindTargetDays > 0 && (
                  <p className="text-sm text-slate-600 mt-1">
                    {overview.behindTargetDays} days behind target
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Needs Attention</h3>
            {overview.needsAttention.length > 0 ? (
              <ul className="space-y-3">
                {overview.needsAttention.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100"
                  >
                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.reasonText}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Action: {item.nextStepLabel}
                        {item.dueDate && (
                          <span className="ml-2">• Due {new Date(item.dueDate).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="All clear"
                description="No items need attention right now."
                className="py-8"
              />
            )}
          </div>

          {/* Next Actions */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Next Actions</h3>
            {overview.nextActions.length > 0 ? (
              <ul className="space-y-3">
                {overview.nextActions.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100"
                  >
                    <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.reasonText}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Action: {item.nextStepLabel}
                        {item.dueDate && (
                          <span className="ml-2">• Due {new Date(item.dueDate).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No pending actions"
                description="There are no actions required at this time."
                className="py-8"
              />
            )}
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Project Details Card */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500">State</dt>
                <dd className="text-sm font-medium text-slate-900">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    overview.projectState === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    overview.projectState === 'DRAFT' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {overview.projectState}
                  </span>
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Start Date
                </dt>
                <dd className="text-sm font-medium text-slate-900">
                  {overview.dateRange.startDate
                    ? new Date(overview.dateRange.startDate).toLocaleDateString()
                    : 'Not set'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> Due Date
                </dt>
                <dd className="text-sm font-medium text-slate-900">
                  {overview.dateRange.dueDate
                    ? new Date(overview.dateRange.dueDate).toLocaleDateString()
                    : 'Not set'}
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-500 flex items-center gap-1">
                  {overview.structureLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  Structure
                </dt>
                <dd className="text-sm font-medium text-slate-900">
                  {overview.structureLocked ? 'Locked' : 'Editable'}
                </dd>
              </div>
            </dl>
          </div>

          {/* KPI Panel */}
          {workspaceId && (
            <ProjectKpiPanel
              projectId={projectId!}
              workspaceId={workspaceId}
            />
          )}
        </div>
      </div>

      {/* Project Linking Section (Admin only) */}
      {project && (
        <ProjectLinkingSection
          projectId={projectId!}
          project={project}
          onUpdated={refreshProject}
        />
      )}
    </div>
  );
};

export default ProjectOverviewTab;
