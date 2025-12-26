import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';
import { usersApi } from '@/features/admin/users/users.api';

interface GeneralTabProps {
  workspaceId: string;
  workspace: {
    name: string;
    description?: string;
    ownerId?: string;
    visibility: 'public' | 'private';
    defaultMethodology?: string;
  };
  onUpdate: () => void;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function GeneralTab({ workspaceId, workspace, onUpdate }: GeneralTabProps) {
  const { user: currentUser } = useAuth();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [ownerId, setOwnerId] = useState(workspace.ownerId || '');
  const [visibility, setVisibility] = useState(workspace.visibility);
  const [methodology, setMethodology] = useState(workspace.defaultMethodology || 'waterfall');
  const [saving, setSaving] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);
  const [pendingOwnerId, setPendingOwnerId] = useState<string>('');
  // TODO: Phase 4 - Replace hardcoded flag with actual permission check from API
  // Should check 'edit_workspace_settings' permission from workspace settings endpoint
  // Backend guards will reject unauthorized PATCH requests, but form should be disabled for clarity
  const canEdit = true;

  // Load available users for owner dropdown
      useEffect(() => {
        if (currentUser?.organizationId) {
          usersApi.getUsers({ limit: 1000 }).then((response) => {
            setAvailableUsers(response.users);
          }).catch(console.error);
        }
      }, [currentUser?.organizationId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/settings`, {
        name,
        description,
        visibility,
        defaultMethodology: methodology,
      });
      toast.success('Workspace settings updated');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update workspace settings:', error);
      toast.error(error?.response?.data?.message || 'Failed to update workspace settings');
    } finally {
      setSaving(false);
    }
  };

  const handleOwnerChange = (newOwnerId: string) => {
    if (newOwnerId !== ownerId) {
      setPendingOwnerId(newOwnerId);
      setShowOwnerConfirm(true);
    }
  };

  const confirmOwnerChange = async () => {
    setSaving(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/settings`, {
        ownerId: pendingOwnerId,
      });
      toast.success('Workspace owner updated');
      setOwnerId(pendingOwnerId);
      setShowOwnerConfirm(false);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update workspace owner:', error);
      toast.error(error?.response?.data?.message || 'Failed to update workspace owner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="ws-settings-general-root">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">General Settings</h1>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Workspace Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
            disabled={saving || !canEdit}
            data-testid="ws-settings-name-input"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={saving || !canEdit}
            data-testid="ws-settings-description-input"
          />
        </div>

        <div>
          <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
            Owner
          </label>
          <select
            id="owner"
            value={ownerId}
            onChange={(e) => handleOwnerChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={saving || !canEdit}
            data-testid="ws-settings-owner-select"
          >
            <option value="">Select an owner</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={saving || !canEdit}
            data-testid="ws-settings-visibility-select"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div>
          <label htmlFor="methodology" className="block text-sm font-medium text-gray-700 mb-1">
            Default Methodology
          </label>
          <select
            id="methodology"
            value={methodology}
            onChange={(e) => setMethodology(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            disabled={saving || !canEdit}
            data-testid="ws-settings-methodology-select"
          >
            <option value="waterfall">Waterfall</option>
            <option value="agile">Agile</option>
            <option value="scrum">Scrum</option>
            <option value="kanban">Kanban</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="ws-settings-general-save"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Owner change confirmation dialog */}
      {showOwnerConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Change Workspace Owner</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to change the workspace owner? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowOwnerConfirm(false);
                  setPendingOwnerId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmOwnerChange}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Changing...' : 'Change Owner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

