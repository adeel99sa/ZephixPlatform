import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PermissionsTabProps {
  workspaceId: string;
  permissionsConfig?: Record<string, string[]> | null;
  onUpdate: () => void;
}

type PermissionAction =
  | 'view_workspace'
  | 'edit_workspace_settings'
  | 'manage_workspace_members'
  | 'change_workspace_owner'
  | 'archive_workspace'
  | 'delete_workspace'
  | 'create_project_in_workspace'
  | 'create_board_in_workspace'
  | 'create_document_in_workspace';

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

const actions: Array<{ id: PermissionAction; label: string }> = [
  { id: 'view_workspace', label: 'View workspace' },
  { id: 'edit_workspace_settings', label: 'Edit workspace settings' },
  { id: 'manage_workspace_members', label: 'Manage members' },
  { id: 'change_workspace_owner', label: 'Change owner' },
  { id: 'archive_workspace', label: 'Archive workspace' },
  { id: 'delete_workspace', label: 'Delete workspace' },
  { id: 'create_project_in_workspace', label: 'Create projects' },
  { id: 'create_board_in_workspace', label: 'Create boards' },
  { id: 'create_document_in_workspace', label: 'Create documents and forms' },
];

const roles: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer'];

const defaultConfig: Record<PermissionAction, string[]> = {
  view_workspace: ['owner', 'admin', 'member', 'viewer'],
  edit_workspace_settings: ['owner', 'admin'],
  manage_workspace_members: ['owner', 'admin'],
  change_workspace_owner: ['owner'],
  archive_workspace: ['owner', 'admin'],
  delete_workspace: ['owner'],
  create_project_in_workspace: ['owner', 'admin', 'member'],
  create_board_in_workspace: ['owner', 'admin', 'member'],
  create_document_in_workspace: ['owner', 'admin', 'member', 'viewer'],
};

export default function PermissionsTab({
  workspaceId,
  permissionsConfig,
  onUpdate,
}: PermissionsTabProps) {
  const [config, setConfig] = useState<Record<string, string[]>>(
    permissionsConfig || defaultConfig,
  );
  const [saving, setSaving] = useState(false);

  const togglePermission = (action: PermissionAction, role: WorkspaceRole) => {
    // Owner always has all permissions - cannot be unchecked
    if (role === 'owner') {
      return;
    }

    const currentRoles = config[action] || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    // Ensure owner is always included
    if (!newRoles.includes('owner')) {
      newRoles.push('owner');
    }

    setConfig({
      ...config,
      [action]: newRoles,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/settings`, {
        permissionsConfig: config,
      });
      toast.success('Permissions updated');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      toast.error(error?.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="ws-settings-permissions-root">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure what each role can do in this workspace
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          data-testid="ws-settings-permissions-save"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              {roles.map((role) => (
                <th
                  key={role}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase capitalize"
                >
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {actions.map((action) => {
              const actionId = `ws-settings-permissions-row-${action.id.replace(/_/g, '-')}`;
              return (
                <tr key={action.id} data-testid={actionId}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{action.label}</td>
                  {roles.map((role) => {
                    const hasPermission = (config[action.id] || []).includes(role);
                    const isOwner = role === 'owner';
                    return (
                      <td key={role} className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={() => togglePermission(action.id, role)}
                          disabled={isOwner || saving}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>Note: Owners always have all permissions and cannot be unchecked.</p>
      </div>
    </div>
  );
}

















