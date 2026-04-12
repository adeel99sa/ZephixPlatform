/**
 * ProjectOverviewTab — three styled cards: team, documents, immediate actions.
 * Project name + description are in the persistent header (ProjectPageLayout).
 */

import React, { useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useProjectContext } from '../layout/ProjectPageLayout';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
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
    overviewSnapshot,
    overviewLoading,
    refreshOverviewSnapshot,
  } = useProjectContext();
  const effectiveWorkspaceId = project?.workspaceId ?? workspaceId ?? '';

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

    </div>
  );
};

export default ProjectOverviewTab;
