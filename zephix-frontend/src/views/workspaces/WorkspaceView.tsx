/**
 * PROMPT 4: Workspace View - Hardened page load
 *
 * On mount, fetch workspace by id using route param.
 * - If 200: Render WorkspaceHome and sync store
 * - If 403: Show "No access" state
 * - If 404: Show "Not found" state
 * - Add retry button
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { getWorkspace } from '@/features/workspaces/workspace.api';
import WorkspaceHome from '@/features/workspaces/views/WorkspaceHome';
import { WorkspaceAccessState } from '@/components/workspace/WorkspaceAccessStates';
import { SuspendedAccessScreen } from '@/components/workspace/SuspendedAccessScreen';
import { Button } from '@/components/ui/Button';
import {
  accessDecisionFromEntity,
  normalizeAccessDecision,
  redirectToSessionExpiredLogin,
} from '@/lib/api/accessDecision';

type WorkspaceLoadState = 'loading' | 'success' | 'no-access' | 'not-found' | 'error' | 'suspended';

export default function WorkspaceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeWorkspaceId,
    setActiveWorkspace,
    markWorkspaceHydrated,
    setHydrating,
    clearActiveWorkspace,
  } = useWorkspaceStore();
  const { user, loading: authLoading } = useAuth();
  const [loadState, setLoadState] = useState<WorkspaceLoadState>('loading');

  useEffect(() => {
    // Guard: Don't fetch until auth state is READY
    if (authLoading) {
      return;
    }
    // Guard: Don't fetch if user doesn't exist
    if (!user) {
      return;
    }
    // Guard: Don't fetch if organizationId doesn't exist
    if (!user.organizationId) {
      return;
    }
    // Guard: Don't fetch if workspaceId from URL doesn't exist
    if (!id) {
      setLoadState('not-found');
      return;
    }

    // PROMPT 4: Fetch workspace and handle errors
    loadWorkspace(id);
  }, [id, user, authLoading]);

  async function loadWorkspace(workspaceId: string) {
    setHydrating(true);
    setLoadState('loading');

    try {
      const workspace = await getWorkspace(workspaceId);
      const decision = accessDecisionFromEntity(workspace);
      if (decision === 'missing') {
        if (activeWorkspaceId === workspaceId) {
          clearActiveWorkspace();
        }
        window.dispatchEvent(new Event('workspace:refresh'));
        setLoadState('not-found');
        setHydrating(false);
        return;
      }

      // Success: Sync store and render
      setActiveWorkspace(workspaceId);
      markWorkspaceHydrated(workspaceId);
      setLoadState('success');
    } catch (error: any) {
      const decision = normalizeAccessDecision(error);
      const errorCode = error?.response?.data?.code;
      if (decision === 'session_expired') {
        redirectToSessionExpiredLogin();
        return;
      }
      if (decision === 'forbidden' && errorCode === 'SUSPENDED') {
        setLoadState('suspended');
      } else if (decision === 'forbidden') {
        if (activeWorkspaceId === workspaceId) {
          clearActiveWorkspace();
        }
        window.dispatchEvent(new Event('workspace:refresh'));
        setLoadState('no-access');
      } else if (decision === 'missing') {
        if (activeWorkspaceId === workspaceId) {
          clearActiveWorkspace();
        }
        window.dispatchEvent(new Event('workspace:refresh'));
        setLoadState('not-found');
      } else {
        setLoadState('error');
      }
      setHydrating(false);
    }
  }

  function handleRetry() {
    if (id) {
      loadWorkspace(id);
    }
  }

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  // Redirect if no organizationId
  if (!user.organizationId) {
    navigate('/403');
    return null;
  }

  // Show error if no workspaceId in URL
  if (!id) {
    return <WorkspaceAccessState type="not-found" />;
  }

  // Show loading state
  if (loadState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // PROMPT 8 B3: Show suspended screen
  if (loadState === 'suspended') {
    return <SuspendedAccessScreen />;
  }

  // Show error states
  if (loadState === 'no-access') {
    return <WorkspaceAccessState type="no-access" />;
  }

  if (loadState === 'not-found') {
    return <WorkspaceAccessState type="not-found" />;
  }

  if (loadState === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Error loading workspace</h2>
          <p className="text-gray-600 mb-6">
            Something went wrong. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/workspaces')}>
              Back to workspace list
            </Button>
            <Button onClick={handleRetry}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success: Render workspace home
  return <WorkspaceHome />;
}

