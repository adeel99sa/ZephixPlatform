import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import WorkspaceHome from '@/features/workspaces/views/WorkspaceHome';

export default function WorkspaceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveWorkspace } = useWorkspaceStore();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Guard: Don't set workspace until auth state is READY
    if (authLoading) {
      return;
    }
    // Guard: Don't set workspace if user doesn't exist
    if (!user) {
      return;
    }
    // Guard: Don't set workspace if organizationId doesn't exist
    if (!user.organizationId) {
      return;
    }
    // Guard: Don't set workspace if workspaceId from URL doesn't exist
    if (!id) {
      return;
    }

    // Set active workspace
    setActiveWorkspace(id);
  }, [id, setActiveWorkspace, authLoading, user]);

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="p-6" data-testid="workspace-view">
        <div className="text-center text-gray-500">Loading...</div>
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
    return (
      <div className="p-6" data-testid="workspace-view">
        <div className="text-center text-gray-500">
          <p>No workspace selected</p>
        </div>
      </div>
    );
  }

  return <WorkspaceHome />;
}

