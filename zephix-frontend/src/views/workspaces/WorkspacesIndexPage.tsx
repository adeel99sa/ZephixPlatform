/**
 * PROMPT 4: Workspaces Index Page
 *
 * Route: /workspaces
 * Behavior:
 * - If 0 workspaces: Show empty state with action based on platform role
 * - If 1 workspace: Auto-select and redirect to /workspaces/:id
 * - If 2+: Show list with search, selecting one navigates to /workspaces/:id
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { useWorkspaceStore } from '@/state/workspace.store';
import { listWorkspaces } from '@/features/workspaces/api';
import type { Workspace } from '@/features/workspaces/types';
import { isAdminRole, normalizePlatformRole } from '@/types/roles';
import type { PlatformRole } from '@/types/roles';
import { WorkspaceCreateModal } from '@/features/workspaces/WorkspaceCreateModal';
import { Button } from '@/components/ui/Button';

export default function WorkspacesIndexPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspace, setHydrating } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canCreateWorkspace = isAdminRole(user?.role);
  const platformRole = user?.role ? normalizePlatformRole(user.role) : null;
  const availableWorkspaces = workspaces.filter(w => !w.deletedAt);
  const filteredWorkspaces = availableWorkspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    loadWorkspaces();
  }, [authLoading, user]);

  async function loadWorkspaces() {
    setHydrating(true);
    setLoading(true);
    try {
      const data = await listWorkspaces();
      const workspacesList = Array.isArray(data) ? data : [];
      setWorkspaces(workspacesList);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
    } finally {
      setLoading(false);
      setHydrating(false);
    }
  }

  // STEP 4: Auto-select if only one workspace exists - navigate to /home
  useEffect(() => {
    if (availableWorkspaces.length === 1 && !loading && !authLoading && user) {
      const singleWorkspace = availableWorkspaces[0];
      if (singleWorkspace) {
        setActiveWorkspace(singleWorkspace.id);
        // Navigate to /home - HomeView will handle workspace-scoped rendering
        navigate('/home', { replace: true });
      }
    }
  }, [availableWorkspaces.length, loading, authLoading, user, navigate, setActiveWorkspace]);

  // STEP 2: Workspace selection from /workspaces page - navigate to /home
  function handleSelectWorkspace(workspaceId: string) {
    setActiveWorkspace(workspaceId);
    // Navigate to /home - HomeView will handle workspace-scoped rendering
    navigate('/home', { replace: false });
  }

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

  // Empty state: 0 workspaces
  if (availableWorkspaces.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No workspaces</h2>
          <p className="text-gray-600 mb-6">
            {canCreateWorkspace
              ? 'Create your first workspace to get started.'
              : platformRole === 'MEMBER' || platformRole === 'VIEWER'
              ? 'Ask an admin to create a workspace.'
              : 'Contact an admin to get assigned to a workspace.'}
          </p>
          {canCreateWorkspace && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2"
            >
              Create workspace
            </Button>
          )}
          {!canCreateWorkspace && (
            <p className="text-sm text-gray-500">
              Ask an admin to create a workspace
            </p>
          )}
        </div>

        {canCreateWorkspace && (
          <WorkspaceCreateModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={(workspaceId) => {
              loadWorkspaces();
              setActiveWorkspace(workspaceId);
              // Navigate to /home after creating workspace
              navigate('/home', { replace: false });
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    );
  }

  // List view: 2+ workspaces
  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="workspaces-index-page">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Workspaces</h1>
        <p className="text-gray-600">Select a workspace to continue</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search workspaces..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      {/* Workspace List */}
      {filteredWorkspaces.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500">No workspaces match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWorkspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => handleSelectWorkspace(ws.id)}
              className="w-full text-left px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
            >
              <div className="font-medium text-gray-900">{ws.name}</div>
              {ws.description && (
                <div className="text-sm text-gray-500 mt-1">{ws.description}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Create Workspace Button (Admin only) */}
      {canCreateWorkspace && (
        <div className="mt-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="ghost"
            className="px-4 py-2"
          >
            + Create new workspace
          </Button>
        </div>
      )}

      {canCreateWorkspace && (
        <WorkspaceCreateModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(workspaceId) => {
            loadWorkspaces();
            setActiveWorkspace(workspaceId);
            // Navigate to /home after creating workspace
            navigate('/home', { replace: false });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
