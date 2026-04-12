/**
 * ProjectOverviewTab — redesigned with three colored cards.
 *
 * Card 1: Project header (gradient)
 * Card 2: Team + Documents (side by side)
 * Card 3: Immediate actions
 *
 * Health panel + cost/advanced metrics + program/portfolio remain below.
 */

import React, { useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import { ProjectLinkingSection } from '../components/ProjectLinkingSection';
import { ProjectKpiPanel } from '../components/ProjectKpiPanel';
import { BudgetSummaryPanel } from '../components/BudgetSummaryPanel';
import { BaselinePanel } from '../components/BaselinePanel';
import { EarnedValuePanel } from '../components/EarnedValuePanel';
import { ProjectOverviewCards } from '../components/ProjectOverviewCards';
import type { ProjectOverview } from '../model/projectOverview';
import { useEffect } from 'react';

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

  const overview: ProjectOverview | null = overviewSnapshot;

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) {
      navigate(`/projects/${projectId}/tasks?taskId=${taskId}`, { replace: true });
    }
  }, [projectId, searchParams, navigate]);

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
