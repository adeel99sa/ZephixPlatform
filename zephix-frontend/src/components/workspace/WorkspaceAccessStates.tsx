/**
 * PROMPT 4: Workspace Access States
 *
 * Reusable components for 403 (No access) and 404 (Not found) states
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

type WorkspaceAccessStateProps = {
  type: 'no-access' | 'not-found';
  workspaceId?: string;
};

export function WorkspaceAccessState({ type, workspaceId }: WorkspaceAccessStateProps) {
  const navigate = useNavigate();

  if (type === 'no-access') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No access</h2>
          <p className="text-gray-600 mb-6">
            You don't have access to this workspace. Contact a workspace owner to request access.
          </p>
          <Button onClick={() => navigate('/workspaces')}>
            Back to workspace list
          </Button>
        </div>
      </div>
    );
  }

  // type === 'not-found'
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Workspace not found</h2>
        <p className="text-gray-600 mb-6">
          This workspace doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate('/workspaces')}>
          Back to workspace list
        </Button>
      </div>
    </div>
  );
}
