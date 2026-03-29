import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { projectsApi, type ProjectDetail } from '../projects.api';
import { EmptyState } from '@/components/ui/feedback/EmptyState';
import {
  accessDecisionFromEntity,
  accessDecisionMessage,
  normalizeAccessDecision,
  redirectToSessionExpiredLogin,
} from '@/lib/api/accessDecision';

export interface ProjectContextValue {
  project: ProjectDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const ProjectContext = React.createContext<ProjectContextValue>({
  project: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useProjectContext(): ProjectContextValue {
  return React.useContext(ProjectContext);
}

/**
 * Tab / main-scroll area: spinner, errors, or nested routes once project is ready.
 * Must render under {@link ProjectPageContextProvider}.
 */
export function ProjectPageContextBody(): React.ReactElement {
  const { loading, error, project, refresh } = useProjectContext();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Unable to load project"
          description={error}
          icon={<AlertTriangle className="h-12 w-12" />}
          action={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to Projects
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          }
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Project not found"
          description={accessDecisionMessage('missing', 'project')}
          icon={<AlertTriangle className="h-12 w-12" />}
          action={
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Back to Projects
            </button>
          }
        />
      </div>
    );
  }

  return <Outlet />;
}

/** Loads project detail and provides ProjectContext for the whole project shell (header + tabs + outlet). */
export function ProjectPageContextProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const projectData = await projectsApi.getProject(projectId);
      const decision = accessDecisionFromEntity(projectData);
      if (decision === 'allowed') {
        setProject(projectData);
      } else {
        window.dispatchEvent(new Event('workspace:refresh'));
        setError(accessDecisionMessage('missing', 'project'));
        setProject(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load project:', err);
      const decision = normalizeAccessDecision(err);
      if (decision === 'session_expired') {
        redirectToSessionExpiredLogin();
        return;
      }
      if (decision === 'forbidden') {
        window.dispatchEvent(new Event('workspace:refresh'));
        setError(accessDecisionMessage('forbidden', 'project'));
      } else if (decision === 'missing') {
        window.dispatchEvent(new Event('workspace:refresh'));
        setError(accessDecisionMessage('missing', 'project'));
      } else {
        setError(accessDecisionMessage('unknown_error', 'project'));
      }
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  /** Deep links: align shell workspace with the loaded project (sidebar tree + x-workspace-id context). */
  useEffect(() => {
    const wsId = project?.workspaceId;
    if (!wsId) return;
    if (activeWorkspaceId === wsId) return;
    setActiveWorkspace(wsId, null);
  }, [project?.workspaceId, project?.id, activeWorkspaceId, setActiveWorkspace]);

  const value = useMemo(
    () => ({
      project,
      loading,
      error,
      refresh: loadProject,
    }),
    [project, loading, error, loadProject],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}
