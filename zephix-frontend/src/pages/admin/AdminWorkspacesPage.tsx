import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { listOrgUsers, changeWorkspaceOwner } from '@/features/workspaces/workspace.api';
import { FolderKanban, Search, Filter, MoreVertical, Archive, Trash2, Eye, Edit, Plus, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';
import { isWorkspaceMembershipV1Enabled } from '@/lib/flags';

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
  const { user } = useAuth();
  const featureEnabled = isWorkspaceMembershipV1Enabled();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChangeOwnerModal, setShowChangeOwnerModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', slug: '', description: '', ownerId: '' });

  useEffect(() => {
    loadWorkspaces();
    loadOrgUsers();
  }, [searchTerm, statusFilter]);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getWorkspaces({
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
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

  const handleChangeOwner = async (workspaceId: string, newOwnerId: string) => {
    try {
      await changeWorkspaceOwner(workspaceId, newOwnerId);
      toast.success('Workspace owner changed successfully');
      setShowChangeOwnerModal(false);
      setSelectedWorkspace(null);
      await loadWorkspaces();
    } catch (error: any) {
      console.error('Failed to change owner:', error);
      toast.error(error?.response?.data?.message || 'Failed to change owner');
    }
  };

  const handleArchive = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to archive this workspace?')) return;
    try {
      await adminApi.archiveWorkspace(workspaceId);
      await loadWorkspaces();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Failed to archive workspace:', error);
      alert('Failed to archive workspace');
    }
  };

  const handleDelete = async (workspaceId: string) => {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) return;
    try {
      await adminApi.deleteWorkspace(workspaceId);
      await loadWorkspaces();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert('Failed to delete workspace');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Workspaces</h1>
          <p className="text-gray-500 mt-1">View and manage all workspaces in your organization</p>
        </div>
        {featureEnabled && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Workspace
          </button>
        )}
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredWorkspaces.map((workspace) => (
              <div key={workspace.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
                          {workspace.ownerId && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              <User className="h-3 w-3 inline mr-1" />
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{workspace.description || 'No description'}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{workspace.projectCount || 0} projects</span>
                          {workspace.status && (
                            <span className={`px-2 py-0.5 rounded ${
                              workspace.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {workspace.status}
                            </span>
                          )}
                          {workspace.createdAt && (
                            <span>Created {new Date(workspace.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/workspaces/${workspace.id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View workspace"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(
                          showActionsMenu === workspace.id ? null : workspace.id
                        )}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {showActionsMenu === workspace.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          {featureEnabled && (
                            <button
                              onClick={() => {
                                setSelectedWorkspace(workspace);
                                setShowChangeOwnerModal(true);
                                setShowActionsMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <User className="h-4 w-4" />
                              Change Owner
                            </button>
                          )}
                          <button
                            onClick={() => handleArchive(workspace.id)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Archive className="h-4 w-4" />
                            Archive
                          </button>
                          <button
                            onClick={() => handleDelete(workspace.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Create Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewWorkspace({
                      ...newWorkspace,
                      name,
                      slug: newWorkspace.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Engineering Workspace"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={newWorkspace.slug}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, slug: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="engineering-workspace"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Workspace description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Owner *
                </label>
                <select
                  value={newWorkspace.ownerId}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, ownerId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select owner...</option>
                  {orgUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only existing organization users can be assigned as workspace owner
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkspace({ name: '', slug: '', description: '', ownerId: '' });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspace.name || !newWorkspace.ownerId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Workspace
              </button>
            </div>
          </div>
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
                  value={newWorkspace.ownerId}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, ownerId: e.target.value })}
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
                  setNewWorkspace({ name: '', slug: '', description: '', ownerId: '' });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newWorkspace.ownerId) {
                    handleChangeOwner(selectedWorkspace.id, newWorkspace.ownerId);
                  }
                }}
                disabled={!newWorkspace.ownerId}
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
