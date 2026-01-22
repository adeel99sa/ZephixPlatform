/**
 * Join Workspace Page
 *
 * Route: /join/workspace?token=...
 * 
 * State machine:
 * - boot: Parse token from URL
 * - missing-token: Token not found in URL
 * - joining: Calling POST /workspaces/join
 * - success: Join successful, redirect to workspace
 * - error: Error state with message
 *
 * Behavior:
 * - If 401 UNAUTHENTICATED: Redirect to /login?returnUrl=<current-url>
 * - If success: Redirect to /workspaces/:workspaceId/home
 * - If ALREADY_MEMBER: Treat as success, redirect to workspace
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { joinWorkspace, type ApiError } from '@/features/workspaces/api/workspace-invite.api';
import { useWorkspaceStore } from '@/state/workspace.store';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

type JoinState =
  | { status: 'boot'; token: string | null; error: ApiError | null }
  | { status: 'missing-token'; token: null; error: ApiError }
  | { status: 'joining'; token: string; error: null }
  | { status: 'success'; token: string; workspaceId: string; error: null }
  | { status: 'error'; token: string; error: ApiError };

export function JoinWorkspacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [state, setState] = useState<JoinState>({
    status: 'boot',
    token: null,
    error: null,
  });

  // Parse token from URL on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState({
        status: 'missing-token',
        token: null,
        error: {
          code: 'MISSING_TOKEN',
          message: 'This invite link is missing a token.',
        },
      });
      return;
    }

    setState({
      status: 'boot',
      token,
      error: null,
    });
  }, [searchParams]);

  // Attempt join when authenticated
  useEffect(() => {
    if (state.status === 'boot' && state.token && !authLoading && user) {
      handleJoin();
    }
  }, [state.status, state.token, authLoading, user]);

  async function handleJoin() {
    if (!state.token) return;

    setState({
      status: 'joining',
      token: state.token,
      error: null,
    });

    try {
      const result = await joinWorkspace({ token: state.token });
      setState({
        status: 'success',
        token: state.token,
        workspaceId: result.workspaceId,
        error: null,
      });

      // Set active workspace and navigate
      setActiveWorkspace(result.workspaceId);
      toast.success('Successfully joined workspace');
      navigate(`/workspaces/${result.workspaceId}/home`);
    } catch (error: any) {
      const apiError = error as ApiError;

      // Handle 401 UNAUTHENTICATED - redirect to login
      if (apiError.statusCode === 401 && apiError.code === 'UNAUTHENTICATED') {
        const currentUrl = window.location.href;
        window.location.href = `/login?returnUrl=${encodeURIComponent(currentUrl)}`;
        return;
      }

      // Handle ALREADY_MEMBER as success
      if (apiError.code === 'ALREADY_MEMBER') {
        // Extract workspaceId from error if available, or navigate to workspace picker
        navigate('/workspaces');
        return;
      }

      // Other errors
      setState({
        status: 'error',
        token: state.token,
        error: apiError,
      });
    }
  }

  // Render based on state
  if (state.status === 'missing-token') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid invite link</h2>
            <p className="text-gray-600 mb-6">{state.error.message}</p>
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

  // Not logged in - show sign in prompt
  if (!authLoading && !user && state.status !== 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Join workspace</h2>
            <p className="text-gray-600 mb-6">Sign in to join this workspace</p>
            <Button
              onClick={() => {
                const currentUrl = window.location.href;
                window.location.href = `/login?returnUrl=${encodeURIComponent(currentUrl)}`;
              }}
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
  if (authLoading || state.status === 'joining' || state.status === 'boot') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">
          {state.status === 'joining' ? 'Joining workspace...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Success state (should redirect, but show message if redirect fails)
  if (state.status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-green-600">Successfully joined workspace! Redirecting...</div>
      </div>
    );
  }

  // Error state
  if (state.status === 'error') {
    const errorMessage = getErrorMessage(state.error);
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Unable to join workspace</h2>
            <p className="text-red-600 mb-6">{errorMessage}</p>
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

function getErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'INVITE_LINK_INVALID':
      return 'This invite link is invalid or has been used.';
    case 'INVITE_LINK_EXPIRED':
      return 'This invite link has expired.';
    case 'INVITE_LINK_REVOKED':
      return 'This invite link has been revoked.';
    case 'USER_NOT_IN_ORG':
      return 'You must be a member of the organization to join this workspace.';
    case 'ALREADY_MEMBER':
      return 'You are already a member of this workspace.';
    default:
      return error.message || 'Failed to join workspace. Please try again.';
  }
}
