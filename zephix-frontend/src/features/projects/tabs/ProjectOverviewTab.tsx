/**
 * ProjectOverviewTab — Phase 5A.6
 *
 * Overview is a focused launch surface: template essentials, quick actions,
 * compact immediate actions, then optional health. Heavy modules are collapsed.
 * Overview data comes from ProjectContext (fetched in ProjectPageLayout).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Play, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import { ProjectLinkingSection } from '../components/ProjectLinkingSection';
import { ProjectKpiPanel } from '../components/ProjectKpiPanel';
import { BudgetSummaryPanel } from '../components/BudgetSummaryPanel';
import { BaselinePanel } from '../components/BaselinePanel';
import { EarnedValuePanel } from '../components/EarnedValuePanel';
import { ProjectMetadataCard } from '../components/ProjectMetadataCard';
import {
  overviewActionItemKey,
  type NeedsAttentionItem,
  type ProjectOverview,
} from '../model/projectOverview';
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
  const { canWrite } = useWorkspaceRole(workspaceId);
  const {
    project,
    refresh: refreshProject,
    overviewSnapshot,
    overviewLoading,
    refreshOverviewSnapshot,
  } = useProjectContext();
  const effectiveWorkspaceId = project?.workspaceId ?? workspaceId ?? '';
  const capabilities = { baselinesEnabled: false, earnedValueEnabled: false };

  const [startWorkError, setStartWorkError] = useState<string | null>(null);
  const [startingWork, setStartingWork] = useState(false);

  const overview: ProjectOverview | null = overviewSnapshot;

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      navigate(`/projects/${projectId}/tasks?taskId=${taskId}`, { replace: true });
    }
  }, [projectId, searchParams, navigate]);

  const handleStartWork = async () => {
    if (!projectId || !effectiveWorkspaceId) return;

    setStartingWork(true);
    setStartWorkError(null);

    try {
      await api.post(
        `/work/projects/${projectId}/start`,
        {},
        {
          headers: { 'x-workspace-id': effectiveWorkspaceId },
        },
      );
      await refreshOverviewSnapshot();
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

  const immediateActionItems = useMemo(() => {
    if (!overview) return [];
    const seen = new Set<string>();
    const out: NeedsAttentionItem[] = [];
    const ordered = [...overview.needsAttention, ...overview.nextActions];
    for (const item of ordered) {
      const key = overviewActionItemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }, [overview]);

  const attentionKeys = useMemo(() => {
    if (!overview) return new Set<string>();
    return new Set(overview.needsAttention.map(overviewActionItemKey));
  }, [overview]);

  const showHealthPanel = useMemo(() => {
    if (!overview) return false;
    return (
      overview.healthCode !== 'HEALTHY' ||
      (overview.behindTargetDays !== null && overview.behindTargetDays > 0)
    );
  }, [overview]);

  if (overviewLoading && !overview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!overviewLoading && !overview) {
    return (
      <EmptyState
        title="Unable to load overview"
        description="Project overview could not be loaded. Try again."
        icon={<AlertCircle className="h-12 w-12" />}
        action={
          <button
            type="button"
            onClick={() => void refreshOverviewSnapshot()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        }
      />
    );
  }

  if (!overview) {
    return null;
  }

  const healthStyle = healthConfig[overview.healthCode] || healthConfig.HEALTHY;
  const HealthIcon = healthStyle.icon;
  const topActions = immediateActionItems.slice(0, 5);

  return (
    <div className="space-y-6">
      {project && effectiveWorkspaceId && (
        <ProjectMetadataCard
          project={project}
          workspaceId={effectiveWorkspaceId}
          deliveryOwnerUserId={overview.deliveryOwnerUserId}
          canEdit={canWrite}
          structureLocked={overview.structureLocked}
          projectState={overview.projectState}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleOpenPlan}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Open Plan
        </button>

        {overview.projectState === 'DRAFT' && canWrite && (
          <button
            type="button"
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

      {topActions.length > 0 && (
        <div
          className="bg-white rounded-lg border border-slate-200 p-4"
          data-testid="project-overview-immediate-actions"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Immediate actions</h3>
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}/tasks`)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              All in Activities →
            </button>
          </div>
          <ul className="space-y-2">
            {topActions.map((item, index) => {
              const urgent = attentionKeys.has(overviewActionItemKey(item));
              return (
                <li
                  key={`${item.entityRef?.taskId ?? index}`}
                  className={`flex items-start gap-2 p-2.5 rounded-md border text-sm ${
                    urgent ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  {urgent ? (
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.reasonText}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.nextStepLabel}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {immediateActionItems.length > 5 && (
            <p className="text-xs text-slate-500 mt-2">
              +{immediateActionItems.length - 5} more — open Activities for the full list.
            </p>
          )}
        </div>
      )}

      {showHealthPanel && (
        <div className={`rounded-lg border p-4 ${healthStyle.bg}`}>
          <div className="flex items-center gap-3">
            <HealthIcon className={`h-6 w-6 shrink-0 ${healthStyle.text}`} />
            <div>
              <h3 className={`text-sm font-semibold ${healthStyle.text}`}>{overview.healthLabel}</h3>
              {overview.behindTargetDays !== null && overview.behindTargetDays > 0 && (
                <p className="text-xs text-slate-600 mt-0.5">
                  {overview.behindTargetDays} days behind target
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <details className="rounded-lg border border-slate-200 bg-white group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg [&::-webkit-details-marker]:hidden flex items-center justify-between">
          <span>Cost &amp; advanced metrics</span>
          <span className="text-xs text-slate-400 group-open:hidden">Show</span>
          <span className="text-xs text-slate-400 hidden group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-slate-100 p-4 space-y-4">
          {projectId && <BudgetSummaryPanel projectId={projectId} />}
          {projectId && project && (
            <BaselinePanel
              projectId={projectId}
              baselinesEnabled={capabilities.baselinesEnabled}
              workspaceRole={(project as { workspaceRole?: string }).workspaceRole}
            />
          )}
          {projectId && project && (
            <EarnedValuePanel
              projectId={projectId}
              earnedValueEnabled={capabilities.earnedValueEnabled}
              workspaceRole={(project as { workspaceRole?: string }).workspaceRole}
            />
          )}
          {effectiveWorkspaceId && (
            <ProjectKpiPanel projectId={projectId!} workspaceId={effectiveWorkspaceId} />
          )}
        </div>
      </details>

      {project && (
        <details className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
          <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 hover:bg-slate-100/80 rounded-lg [&::-webkit-details-marker]:hidden">
            Program &amp; portfolio (optional)
          </summary>
          <div className="border-t border-slate-200 p-4">
            <ProjectLinkingSection
              projectId={projectId!}
              project={project}
              onUpdated={refreshProject}
            />
          </div>
        </details>
      )}
    </div>
  );
};

export default ProjectOverviewTab;
