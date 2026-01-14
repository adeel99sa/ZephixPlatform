import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { listWorkspaces } from '@/features/workspaces/api';
import type { Workspace } from '@/features/workspaces/types';
import { isAdminRole } from '@/types/roles';
import { WorkspaceCreateModal } from '@/features/workspaces/WorkspaceCreateModal';

/**
 * Patch 1: Workspace selection screen shown when no workspace is selected
 */
export function WorkspaceSelectionScreen() {
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canCreateWorkspace = isAdminRole(user?.role);
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const loadWorkspaces = async () => {
      try {
        setLoading(true);
        const data = await listWorkspaces();
        setWorkspaces(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load workspaces:', error);
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, [authLoading, user]);

  // Auto-select if only one workspace exists
  useEffect(() => {
    if (availableWorkspaces.length === 1 && !authLoading && user) {
      setActiveWorkspace(availableWorkspaces[0].id);
    }
  }, [availableWorkspaces.length, authLoading, user, setActiveWorkspace]);

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspaces...</p>
        </div>
      </div>
    );
  }

  // If only one workspace, show loader while auto-selecting
  if (availableWorkspaces.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Selecting workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Select workspace</h2>
          <p className="text-gray-600 mb-6">Select a workspace to continue.</p>

          {availableWorkspaces.length > 0 ? (
            <div className="space-y-2 mb-6">
              {availableWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 hover:border-blue-500 transition-colors"
                >
                  <div className="font-medium text-gray-900">{ws.name}</div>
                  {ws.description && (
                    <div className="text-sm text-gray-500 mt-1">{ws.description}</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-4">No workspaces available.</p>
            </div>
          )}

          {canCreateWorkspace && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create new workspace
            </button>
          )}

          {!canCreateWorkspace && availableWorkspaces.length === 0 && (
            <p className="text-sm text-gray-500 mt-4">
              Contact an admin to get assigned to a workspace.
            </p>
          )}
        </div>
      </div>

      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(workspaceId) => {
            setActiveWorkspace(workspaceId);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

