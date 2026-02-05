import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { useAuth } from '@/state/AuthContext';
import { track } from '@/lib/telemetry';
import {
  Users, Search, Plus, MoreVertical, Mail, UserCheck, UserX,
  Edit, Trash2, Shield, Filter, CheckSquare, Square, Download,
  Circle, Clock, Ban, LogOut
} from 'lucide-react';
import { InviteUsersDrawer } from './_components/InviteUsersDrawer';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastActive: string;
  joinedAt: string;
  organizationId?: string;
}

type StatusFilter = 'all' | 'active' | 'pending' | 'suspended' | 'left';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);

  useEffect(() => {
    track('admin.users.viewed');
    loadUsers();
  }, [pagination.page, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOrganizationUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      const users = (data.users || []) as User[];
      setUsers(users);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkRoleChange = async (newRole: 'admin' | 'pm' | 'viewer') => {
    if (!currentUser?.organizationId || selectedUsers.size === 0) return;

    setActionLoading(true);
    try {
      const updates = Array.from(selectedUsers).map(userId => ({
        userId,
        role: newRole,
      }));

      await adminApi.bulkUpdateUserRoles(currentUser.organizationId, updates);
      await loadUsers();
      setSelectedUsers(new Set());
      setShowRoleModal(false);
    } catch (error) {
      console.error('Failed to update roles:', error);
      alert('Failed to update user roles');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!currentUser?.organizationId || selectedUsers.size === 0) return;

    if (!confirm(`Are you sure you want to remove ${selectedUsers.size} user(s) from the organization?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.bulkRemoveUsers(currentUser.organizationId, Array.from(selectedUsers));
      await loadUsers();
      setSelectedUsers(new Set());
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to remove users:', error);
      alert('Failed to remove users');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'pm' | 'viewer' | 'member') => {
    if (!currentUser?.organizationId) return;

    setActionLoading(true);
    try {
      await adminApi.updateUserRole(currentUser.organizationId, userId, newRole);
      await loadUsers();
      track('admin.users.role_changed', { userId, newRole });
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!currentUser?.organizationId) return;
    if (!confirm('Are you sure you want to suspend this user?')) return;

    setActionLoading(true);
    try {
      // TODO: Implement suspend endpoint
      // await adminApi.suspendUser(currentUser.organizationId, userId);
      alert('Suspend functionality will be available soon');
      await loadUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser?.organizationId) return;

    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.removeUser(currentUser.organizationId, userId);
      await loadUsers();
    } catch (error) {
      console.error('Failed to remove user:', error);
      alert('Failed to remove user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    alert('CSV export will be available soon');
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      pm: 'bg-green-100 text-green-800',
      member: 'bg-green-100 text-green-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Owner',
      admin: 'Admin',
      pm: 'Member',
      member: 'Member',
      viewer: 'Viewer',
    };
    return labels[role] || role;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
      active: {
        icon: UserCheck,
        color: 'bg-green-100 text-green-800',
        label: 'Active',
      },
      pending: {
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Pending',
      },
      suspended: {
        icon: Ban,
        color: 'bg-red-100 text-red-800',
        label: 'Suspended',
      },
      left: {
        icon: LogOut,
        color: 'bg-gray-100 text-gray-800',
        label: 'Left',
      },
    };

    const config = statusConfig[status.toLowerCase()] || {
      icon: Circle,
      color: 'bg-gray-100 text-gray-800',
      label: status,
    };

    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const isUserOnline = (lastActive: string) => {
    if (!lastActive) return false;
    const lastActiveDate = new Date(lastActive);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastActiveDate > fiveMinutesAgo;
  };

  const formatLastSeen = (lastActive: string) => {
    if (!lastActive) return 'Never';
    const date = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6" data-testid="admin-users-root">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">Manage organization members and their roles</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowInviteDrawer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Invite Users
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending Invites</option>
            <option value="suspended">Suspended</option>
            <option value="left">Left Organization</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="pm">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-3 pt-4 mt-4 border-t border-gray-200">
            <span className="text-sm text-gray-700">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRoleModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Shield className="h-4 w-4" />
                Change Role
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" data-testid="admin-users-table">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by inviting your first team member'}
            </p>
            {!searchTerm && statusFilter === 'all' && roleFilter === 'all' && (
              <button
                onClick={() => setShowInviteDrawer(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Invite your first member
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-400 hover:text-gray-600"
                      title="Select all"
                    >
                      {selectedUsers.size === users.length ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const isOnline = isUserOnline(user.lastActive);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectUser(user.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {selectedUsers.has(user.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {user.firstName?.[0] || user.email[0].toUpperCase()}
                              </span>
                            </div>
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                {getRoleLabel(user.role)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{user.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isOnline && (
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                          )}
                          <span className="text-sm text-gray-500">
                            {formatLastSeen(user.lastActive)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleRoleChange(user.id, e.target.value as 'admin' | 'pm' | 'viewer' | 'member');
                            }}
                            disabled={actionLoading || user.role === 'owner'}
                            className={`px-2 py-1 rounded text-xs font-medium border ${getRoleBadgeColor(user.role)} ${
                              user.role === 'owner' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="pm">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Show actions menu
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Change Role for {selectedUsers.size} User(s)</h3>
            <div className="space-y-3 mb-6">
              {(['viewer', 'pm', 'admin'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => handleBulkRoleChange(role)}
                  disabled={actionLoading}
                  className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="font-medium capitalize">{role === 'pm' ? 'Member' : role}</div>
                  <div className="text-sm text-gray-500">
                    {role === 'viewer' && 'Read-only access'}
                    {role === 'pm' && 'Can manage projects'}
                    {role === 'admin' && 'Full administrative access'}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Remove Users</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove {selectedUsers.size} user(s) from the organization? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Removing...' : 'Remove Users'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Users Drawer */}
      <InviteUsersDrawer
        isOpen={showInviteDrawer}
        onClose={() => setShowInviteDrawer(false)}
        onSuccess={() => {
          loadUsers();
          track('admin.users.invited');
        }}
      />
    </div>
  );
}
