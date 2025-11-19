import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { Shield, Plus, Users, X, Edit, Trash2, Save } from 'lucide-react';

interface Role {
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isCustom: boolean;
}

interface Permission {
  id: string;
  label: string;
  category: string;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'users.view', label: 'View Users', category: 'Users' },
  { id: 'users.manage', label: 'Manage Users', category: 'Users' },
  { id: 'projects.view', label: 'View Projects', category: 'Projects' },
  { id: 'projects.manage', label: 'Manage Projects', category: 'Projects' },
  { id: 'projects.delete', label: 'Delete Projects', category: 'Projects' },
  { id: 'templates.view', label: 'View Templates', category: 'Templates' },
  { id: 'templates.manage', label: 'Manage Templates', category: 'Templates' },
  { id: 'workspaces.view', label: 'View Workspaces', category: 'Workspaces' },
  { id: 'workspaces.manage', label: 'Manage Workspaces', category: 'Workspaces' },
  { id: 'reports.view', label: 'View Reports', category: 'Reports' },
  { id: 'reports.manage', label: 'Manage Reports', category: 'Reports' },
  { id: 'admin.access', label: 'Admin Access', category: 'Administration' },
];

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] as string[] });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await adminApi.getRoles();
      setRoles(data.roles || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.description) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await adminApi.createRole(newRole);
      await loadRoles();
      setShowCreateModal(false);
      setNewRole({ name: '', description: '', permissions: [] });
    } catch (error) {
      console.error('Failed to create role:', error);
      alert('Failed to create role');
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    if (editingRole) {
      const newPermissions = editingRole.permissions.includes(permissionId)
        ? editingRole.permissions.filter(p => p !== permissionId)
        : [...editingRole.permissions, permissionId];
      setEditingRole({ ...editingRole, permissions: newPermissions });
    } else {
      const newPermissions = newRole.permissions.includes(permissionId)
        ? newRole.permissions.filter(p => p !== permissionId)
        : [...newRole.permissions, permissionId];
      setNewRole({ ...newRole, permissions: newPermissions });
    }
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">Manage user roles and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Custom Role
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <div key={role.name} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {role.isCustom && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                      Custom
                    </span>
                  )}
                  {role.isCustom && (
                    <button
                      onClick={() => setEditingRole(role)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {permission}
                    </span>
                  ))}
                  {role.permissions.includes('*') && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      All Permissions
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{role.userCount} user{role.userCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Custom Role</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRole({ name: '', description: '', permissions: [] });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g., Senior PM"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Describe what this role can do..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-4 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</p>
                      <div className="space-y-2">
                        {perms.map(perm => (
                          <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newRole.permissions.includes(perm.id)}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateRole}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Create Role
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRole({ name: '', description: '', permissions: [] });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Role: {editingRole.name}</h3>
              <button
                onClick={() => setEditingRole(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-4 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</p>
                      <div className="space-y-2">
                        {perms.map(perm => (
                          <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingRole.permissions.includes(perm.id)}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={async () => {
                    try {
                      await adminApi.createRole({
                        name: editingRole.name,
                        description: editingRole.description,
                        permissions: editingRole.permissions,
                      });
                      await loadRoles();
                      setEditingRole(null);
                    } catch (error) {
                      alert('Failed to update role');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
