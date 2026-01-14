/**
 * PROMPT 7 B1: Join Workspace Page
 *
 * Route: /join/workspace
 * Reads token from query param
 * If not logged in, show sign in screen
 * If logged in, call join endpoint and navigate to workspace
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { joinWorkspace } from '@/features/workspaces/api/workspace-invite.api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

export function JoinWorkspacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!authLoading && user && token) {
      handleJoin();
    }
  }, [authLoading, user, token]);

  async function handleJoin() {
    if (!token) {
      setError('Invalid invite link');
      return;
    }

    if (!user) {
      // Will show sign in screen
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const result = await joinWorkspace(token);
      setActiveWorkspace(result.workspaceId);
      toast.success('Successfully joined workspace');
      navigate(`/workspaces/${result.workspaceId}`);
    } catch (error: any) {
      console.error('Failed to join workspace:', error);
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.message;
      const displayMessage = getApiErrorMessage({ code: errorCode, message: errorMessage });
      setError(displayMessage);
    } finally {
      setJoining(false);
    }
  }

  // PROMPT 7 B1: If not logged in, show sign in screen
  if (!authLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Join workspace</h2>
            <p className="text-gray-600 mb-6">Sign in to join this workspace</p>
            <Button
              onClick={() => navigate('/login', { state: { returnTo: `/join/workspace?token=${token}` } })}
              className="w-full"
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading or joining state
  if (authLoading || joining) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">
          {joining ? 'Joining workspace...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Unable to join workspace</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/workspaces')}
              variant="outline"
              className="w-full"
            >
              Back to workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No token
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid invite link</h2>
            <p className="text-gray-600 mb-6">This invite link is missing a token.</p>
            <Button
              onClick={() => navigate('/workspaces')}
              variant="outline"
              className="w-full"
            >
              Back to workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
