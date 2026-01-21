/**
 * PHASE 5.3: Workspace Home by Slug
 *
 * Fetches workspace home data using slug and renders WorkspaceHome component
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/lib/api';
import WorkspaceHome from '@/features/workspaces/views/WorkspaceHome';

interface WorkspaceHomeData {
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    owner: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  };
  stats: {
    activeProjectsCount: number;
    membersCount: number;
  };
  lists: {
    activeProjects: Array<{
      id: string;
      name: string;
      status: string;
    }>;
  };
  topRisksCount: number;
}

export default function WorkspaceHomeBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspace, markWorkspaceHydrated, setHydrating } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !slug) {
      return;
    }

    loadWorkspaceHome();
  }, [authLoading, user, slug]);

  async function loadWorkspaceHome() {
    if (!slug) {
      setError('Missing workspace slug');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHydrating(true);

    try {
      const response = await api.get<{ data: WorkspaceHomeData }>(
        `/workspaces/slug/${slug}/home`
      );

      const data = response.data;

      if (!data || !data.workspace) {
        setError('Workspace not found');
        setLoading(false);
        setHydrating(false);
        return;
      }

      // Sync workspace store
      setActiveWorkspace(data.workspace.id);
      markWorkspaceHydrated(data.workspace.id);
      setLoading(false);
      setHydrating(false);
    } catch (error: any) {
      console.error('Failed to load workspace home:', error);

      if (error?.response?.status === 404) {
        setError('Workspace not found');
        // Don't navigate - let user see error or redirect manually
      } else {
        setError('Failed to load workspace');
      }

      setLoading(false);
      setHydrating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigate('/workspaces')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to workspace list
            </button>
            <button
              onClick={loadWorkspaceHome}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render WorkspaceHome component (it will use activeWorkspaceId from store)
  return <WorkspaceHome />;
}
