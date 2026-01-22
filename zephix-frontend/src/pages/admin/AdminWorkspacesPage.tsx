/**
 * PROMPT 6: Admin Workspaces Page
 *
 * Layout:
 * - Header: Title "Workspaces", Primary button "New workspace"
 * - Body list: Table with workspace name, owners count, members count, Open button, Manage owners button
 * - Empty state: "No workspaces yet", Primary action "Create workspace"
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { isAdminUser } from '@/types/roles';
import { listWorkspaces } from '@/features/admin/api/adminWorkspaces.api';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { CreateWorkspaceModal } from '@/features/admin/components/CreateWorkspaceModal';
import { ManageOwnersModal } from '@/features/admin/components/ManageOwnersModal';

type Workspace = {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export default function AdminWorkspacesPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceStats, setWorkspaceStats] = useState<Record<string, { owners: number; members: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manageOwnersWorkspaceId, setManageOwnersWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    // PROMPT 6 B1: Route to /home if not Admin
    if (!authLoading && user) {
      if (!isAdminUser(user)) {
        navigate('/home', { replace: true });
        return;
      }
      loadWorkspaces();
    }
  }, [authLoading, user, navigate]);

  async function loadWorkspaces() {
    if (!user) return;

    setLoading(true);
    try {
      const ws = await listWorkspaces();
      setWorkspaces(ws);

      // Load stats for each workspace
      const stats: Record<string, { owners: number; members: number }> = {};
      for (const workspace of ws) {
        try {
          const members = await listWorkspaceMembers(workspace.id);
          const owners = members.filter(m => m.role === 'workspace_owner').length;
          stats[workspace.id] = {
            owners,
            members: members.length,
          };
        } catch (error) {
          stats[workspace.id] = { owners: 0, members: 0 };
        }
      }
      setWorkspaceStats(stats);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      toast.error('Failed to load workspaces');
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenWorkspace(workspaceId: string) {
    navigate(`/workspaces/${workspaceId}`);
  }

  function handleCreateSuccess(workspaceId: string) {
    setShowCreateModal(false);
    navigate(`/workspaces/${workspaceId}`);
    toast.success('Workspace created');
    loadWorkspaces();
  }

  function handleManageOwnersSuccess() {
    setManageOwnersWorkspaceId(null);
    toast.success('Owners updated');
    loadWorkspaces();
  }

  // PROMPT 6 B1: Show loading or redirect if not Admin
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdminUser(user)) {
    return null; // Will redirect
  }

  return (
    <div className="p-6 space-y-6" data-testid="admin-workspaces-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2"
        >
          New workspace
        </Button>
      </div>

      {/* Body list */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No workspaces yet</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2"
          >
            Create workspace
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workspace name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owners count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members count</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workspaces.map((workspace) => {
                const stats = workspaceStats[workspace.id] || { owners: 0, members: 0 };
                return (
                  <tr key={workspace.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{workspace.name}</div>
                      {workspace.description && (
                        <div className="text-sm text-gray-500 mt-1">{workspace.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{stats.owners}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{stats.members}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenWorkspace(workspace.id)}
                          className="px-3 py-1 text-sm"
                        >
                          Open
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setManageOwnersWorkspaceId(workspace.id)}
                          className="px-3 py-1 text-sm"
                        >
                          Manage owners
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <CreateWorkspaceModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Manage Owners Modal */}
      {manageOwnersWorkspaceId && (
        <ManageOwnersModal
          open={!!manageOwnersWorkspaceId}
          workspaceId={manageOwnersWorkspaceId}
          onClose={() => setManageOwnersWorkspaceId(null)}
          onSuccess={handleManageOwnersSuccess}
        />
      )}
    </div>
  );
}
