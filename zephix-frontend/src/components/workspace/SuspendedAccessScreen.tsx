/**
 * PROMPT 8 B3: Suspended Access Screen
 *
 * Shown when a user's workspace access is suspended
 */
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function SuspendedAccessScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access suspended</h2>
          <p className="text-gray-600 mb-6">Contact a workspace owner</p>
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
