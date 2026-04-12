/**
 * ProjectOverviewTab — redesigned with three colored cards.
 *
 * Card 1: Project header (gradient)
 * Card 2: Team + Documents (side by side)
 * Card 3: Immediate actions
 *
 * Health panel + cost/advanced metrics + program/portfolio remain below.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Play, AlertCircle, CheckCircle } from 'lucide-react';
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
import { ProjectOverviewCards } from '../components/ProjectOverviewCards';
import type { ProjectOverview } from '../model/projectOverview';

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
        { headers: { 'x-workspace-id': effectiveWorkspaceId } },
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

  if (!overview) return null;

  const healthStyle = healthConfig[overview.healthCode] || healthConfig.HEALTHY;
  const HealthIcon = healthStyle.icon;

  return (
    <div className="space-y-6">
      {/* Three styled cards */}
      {project && effectiveWorkspaceId && (
        <ProjectOverviewCards
          project={project}
          workspaceId={effectiveWorkspaceId}
          overview={overview}
          canEdit={canWrite}
        />
      )}

      {/* Start Work button (DRAFT only) */}
      {overview.projectState === 'DRAFT' && canWrite && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStartWork}
            disabled={startingWork}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-4 w-4" />
            {startingWork ? 'Starting...' : 'Start Work'}
          </button>
        </div>
      )}

      {startWorkError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">{startWorkError}</p>
        </div>
      )}

      {/* Health panel */}
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

      {/* Cost & advanced metrics */}
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

      {/* Program & portfolio */}
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
