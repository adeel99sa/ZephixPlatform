import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';
import { usersApi } from '@/features/admin/users/users.api';
import { isAdminRole } from '@/types/roles';

interface MembersTabProps {
  workspaceId: string;
  onUpdate: () => void;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  role: 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  orgRole?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function MembersTab({ workspaceId, onUpdate }: MembersTabProps) {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'workspace_owner' | 'workspace_member' | 'workspace_viewer'>('workspace_member');

  useEffect(() => {
    loadMembers();
    loadAvailableUsers();
  }, [workspaceId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(data);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      toast.error(error?.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!currentUser?.organizationId) return;
    try {
          const response = await usersApi.getUsers({ limit: 1000 });
          const users = response.users;
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'workspace_owner' | 'workspace_member' | 'workspace_viewer') => {
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role: newRole });
      toast.success('Member role updated');
      loadMembers();
    } catch (error: any) {
      console.error('Failed to update role:', error);
      toast.error(error?.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
      toast.success('Member removed');
      loadMembers();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error(error?.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleInvite = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    try {
      await api.post(`/workspaces/${workspaceId}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      toast.success('Member added');
      setShowInviteModal(false);
      setSelectedUserId('');
      loadMembers();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      toast.error(error?.response?.data?.message || 'Failed to add member');
    }
  };

  // Determine effective role and permissions
  const ownerCount = members.filter(m => m.role === 'workspace_owner').length;
  const currentMember = members.find(m => m.userId === currentUser?.id);
  const currentUserWsRole = currentMember?.role || null;
  const isOrgAdmin = isAdminRole(currentUser?.role); // Platform ADMIN has implicit workspace_owner access
  const isWorkspaceOwner = currentUserWsRole === 'workspace_owner';
  const canManage = isOrgAdmin || isWorkspaceOwner;

  // Phase 5: Group members by role
  const owners = members.filter(m => m.role === 'workspace_owner');
  const workspaceMembers = members.filter(m => m.role === 'workspace_member');
  const viewers = members.filter(m => m.role === 'workspace_viewer');

  const formatRoleName = (role: string) => {
    return role.replace('workspace_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div data-testid="ws-settings-members-root">
        <div className="text-center text-gray-500">Loading members...</div>
      </div>
    );
  }

  return (
    <div data-testid="ws-settings-members-root">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
        {canManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            data-testid="ws-settings-members-invite"
          >
            <Plus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Phase 5: Grouped display by role */}
      <div className="space-y-6">
        {/* Owners Section */}
        {owners.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Owners ({owners.length})</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200" data-testid="ws-settings-members-table-owners">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workspace Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {owners.map((member) => (
              <tr key={member.id} data-testid="ws-settings-member-row">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.user.firstName} {member.user.lastName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {canManage ? (
                    <select
                      value={member.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
                        if (newRole !== 'workspace_owner' && ownerCount === 1 && member.role === 'workspace_owner') {
                          toast.error('Cannot demote the last workspace owner. This workspace needs at least one owner.');
                          return;
                        }
                        handleRoleChange(member.userId, newRole);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                      disabled={member.role === 'workspace_owner' && ownerCount === 1}
                      data-testid="ws-settings-member-role-select"
                    >
                      <option value="workspace_owner">Owner</option>
                      <option value="workspace_member">Member</option>
                      <option value="workspace_viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="capitalize">{formatRoleName(member.role)}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {member.orgRole || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {canManage && !(member.role === 'workspace_owner' && ownerCount === 1) && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-red-600 hover:text-red-900"
                      data-testid="ws-settings-member-remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Members Section */}
        {workspaceMembers.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Members ({workspaceMembers.length})</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200" data-testid="ws-settings-members-table-members">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workspace Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workspaceMembers.map((member) => (
                  <tr key={member.id} data-testid="ws-settings-member-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {canManage ? (
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const newRole = e.target.value as 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
                            handleRoleChange(member.userId, newRole);
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                          data-testid="ws-settings-member-role-select"
                        >
                          <option value="workspace_owner">Owner</option>
                          <option value="workspace_member">Member</option>
                          <option value="workspace_viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="capitalize">{formatRoleName(member.role)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {member.orgRole || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {canManage && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-red-600 hover:text-red-900"
                          data-testid="ws-settings-member-remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Viewers Section */}
        {viewers.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Viewers ({viewers.length})</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200" data-testid="ws-settings-members-table-viewers">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Workspace Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Org Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {viewers.map((member) => (
                  <tr key={member.id} data-testid="ws-settings-member-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {canManage ? (
                        <select
                          value={member.role}
                          onChange={(e) => {
                            const newRole = e.target.value as 'workspace_owner' | 'workspace_member' | 'workspace_viewer';
                            handleRoleChange(member.userId, newRole);
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                          data-testid="ws-settings-member-role-select"
                        >
                          <option value="workspace_owner">Owner</option>
                          <option value="workspace_member">Member</option>
                          <option value="workspace_viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="capitalize">{formatRoleName(member.role)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                      {member.orgRole || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {canManage && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-red-600 hover:text-red-900"
                          data-testid="ws-settings-member-remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Invite Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a user</option>
                  {availableUsers
                    .filter(u => !members.some(m => m.userId === u.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'workspace_owner' | 'workspace_member' | 'workspace_viewer')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="workspace_owner">Owner</option>
                  <option value="workspace_member">Member</option>
                  <option value="workspace_viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedUserId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

