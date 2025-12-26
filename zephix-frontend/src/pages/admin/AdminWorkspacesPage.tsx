import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { listOrgUsers, changeWorkspaceOwner } from '@/features/workspaces/workspace.api';
import { FolderKanban, Search, MoreVertical, Archive, Trash2, Eye, Edit, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';
import { track } from '@/lib/telemetry';
import { useWorkspaceStore } from '@/state/workspace.store';
import { openWorkspaceSettingsModal } from '@/features/workspaces/components/WorkspaceSettingsModal/controller';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  projectCount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  owner?: { email?: string; firstName?: string; lastName?: string };
}

interface OrgUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export default function AdminWorkspacesPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');

  useEffect(() => {
    // Guard: Don't fire requests until auth state is READY
    if (authLoading) {
      return;
    }
    // Only load if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    track('admin.workspaces.viewed');
    loadWorkspaces();
    loadOrgUsers();
  }, [authLoading, user, searchTerm, statusFilter]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getWorkspaces({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      // Handle both { data: ... } and direct array responses
      const data = response?.data || response;
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadOrgUsers = async () => {
    try {
      const users = await listOrgUsers();
      setOrgUsers(users);
    } catch (error) {
      console.error('Failed to load org users:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name || !newWorkspace.ownerId) {
      toast.error('Please provide workspace name and owner');
      return;
    }

    try {
      // Generate slug if not provided
      const slug = newWorkspace.slug || newWorkspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const response = await api.post('/workspaces', {
        name: newWorkspace.name,
        slug,
        description: newWorkspace.description || undefined,
        ownerId: newWorkspace.ownerId,
      });

      toast.success('Workspace created successfully');
      setShowCreateModal(false);
      setNewWorkspace({ name: '', slug: '', description: '', ownerId: '' });
      await loadWorkspaces();
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      toast.error(error?.response?.data?.message || 'Failed to create workspace');
    }
  };

  const handleOpenWorkspace = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    track('admin.workspaces.opened', { workspaceId });
    navigate(`/workspaces/${workspaceId}`);
  };

  const handleEditWorkspace = (workspaceId: string) => {
    track('admin.workspaces.edit_opened', { workspaceId, source: 'admin' });
    openWorkspaceSettingsModal(workspaceId);
  };

  const handleChangeOwner = async (workspaceId: string, newOwnerId: string) => {
    try {
      await adminApi.updateWorkspace(workspaceId, { ownerId: newOwnerId });
      track('admin.workspaces.owner_changed', { workspaceId, newOwnerId });
      toast.success('Workspace owner changed successfully');
      setShowChangeOwnerModal(false);
      setSelectedWorkspace(null);
      setNewOwnerId('');
      await loadWorkspaces();
    } catch (error: any) {
      console.error('Failed to change owner:', error);
      toast.error(error?.response?.data?.message || 'Failed to change owner');
    }
  };

  const handleUpdateVisibility = async (workspaceId: string, visibility: 'public' | 'private') => {
    try {
      await adminApi.updateWorkspace(workspaceId, { visibility });
      track('admin.workspaces.visibility_changed', { workspaceId, visibility });
      toast.success('Workspace visibility updated');
      await loadWorkspaces();
    } catch (error: any) {
      console.error('Failed to update visibility:', error);
      toast.error('Failed to update visibility');
    }
  };

  const handleUpdateStatus = async (workspaceId: string, status: 'active' | 'archived') => {
    try {
      await adminApi.updateWorkspace(workspaceId, { status });
      track('admin.workspaces.status_changed', { workspaceId, status });
      toast.success(`Workspace ${status === 'archived' ? 'archived' : 'restored'}`);
      await loadWorkspaces();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };


  const filteredWorkspaces = workspaces.filter(ws => {
    const matchesSearch = !searchTerm ||
      ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ws.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ws.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-workspaces-root">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Workspaces</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage all workspaces in your organization</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Workspaces List */}
      {loading ? (
        <div className="text-gray-500">Loading workspaces...</div>
      ) : filteredWorkspaces.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-2">No workspaces found</p>
          <Link
            to="/workspaces"
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first workspace →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="admin-workspaces-table">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredWorkspaces.map((workspace) => (
                <tr key={workspace.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{workspace.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {workspace.owner?.name || workspace.owner?.email || 'No owner'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={workspace.visibility || 'public'}
                      onChange={(e) => handleUpdateVisibility(workspace.id, e.target.value as 'public' | 'private')}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={workspace.status || 'active'}
                      onChange={(e) => handleUpdateStatus(workspace.id, e.target.value as 'active' | 'archived')}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workspace.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenWorkspace(workspace.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Open workspace"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleEditWorkspace(workspace.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit workspace"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Change Owner Modal */}
      {showChangeOwnerModal && selectedWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Change Workspace Owner</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Owner
                </label>
                <select
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Choose a user...</option>
                  {orgUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  The previous owner will be demoted to member.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowChangeOwnerModal(false);
                  setSelectedWorkspace(null);
                  setNewOwnerId('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newOwnerId && selectedWorkspace) {
                    handleChangeOwner(selectedWorkspace.id, newOwnerId);
                  }
                }}
                disabled={!newOwnerId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change Owner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
