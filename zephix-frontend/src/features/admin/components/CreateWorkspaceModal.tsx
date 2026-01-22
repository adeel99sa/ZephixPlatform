/**
 * PROMPT 6: Create Workspace Modal
 *
 * Fields:
 * - Workspace name (required)
 * - Description (optional)
 * - Owners multi select (required, min 1)
 *   - Default selected includes current Admin user
 *   - Allow selecting other Admin or Member users
 *   - Never show Guests in the list
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/state/AuthContext';
import { createWorkspace } from '../api/adminWorkspaces.api';
import { getOrgUsers } from '../utils/getOrgUsers';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

type OrgUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (workspaceId: string) => void;
};

export function CreateWorkspaceModal({ open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<string>>(new Set());
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadOrgUsers();
      // PROMPT 6: Default selected includes current Admin user
      if (user?.id) {
        setSelectedOwnerIds(new Set([user.id]));
      }
    } else {
      // Reset form when modal closes
      setName('');
      setDescription('');
      setSelectedOwnerIds(new Set());
      setError(null);
    }
  }, [open, user?.id]);

  async function loadOrgUsers() {
    setLoadingUsers(true);
    try {
      const users = await getOrgUsers();
      setOrgUsers(users);
    } catch (error) {
      console.error('Failed to load org users:', error);
      toast.error('Failed to load organization users');
    } finally {
      setLoadingUsers(false);
    }
  }

  function toggleOwner(userId: string) {
    const newSet = new Set(selectedOwnerIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedOwnerIds(newSet);
    setError(null); // Clear error when selection changes
  }

  async function handleSubmit() {
    // PROMPT 6: Validations
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (selectedOwnerIds.size === 0) {
      setError('At least one owner is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        ownerUserIds: Array.from(selectedOwnerIds),
      });

      onSuccess(response.workspaceId);
    } catch (error: any) {
      console.error('Failed to create workspace:', error);
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.message;
      const displayMessage = getApiErrorMessage({ code: errorCode, message: errorMessage });
      setError(displayMessage);
    } finally {
      setLoading(false);
    }
  }

  function getUserName(user: OrgUser): string {
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    return user.email;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create workspace</h2>

          {/* Workspace name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter workspace name"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md resize-y min-h-[80px]"
              placeholder="Optional workspace description"
            />
          </div>

          {/* Owners multi select */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Owners <span className="text-red-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="text-sm text-gray-500 py-4">Loading users...</div>
            ) : (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {orgUsers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    No users available
                  </div>
                ) : (
                  <div className="divide-y">
                    {orgUsers.map((orgUser) => {
                      const isSelected = selectedOwnerIds.has(orgUser.id);
                      return (
                        <button
                          key={orgUser.id}
                          onClick={() => toggleOwner(orgUser.id)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">
                                {getUserName(orgUser)}
                              </div>
                              <div className="text-sm text-gray-500">{orgUser.email}</div>
                            </div>
                            <div className={`w-5 h-5 border-2 rounded ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            } flex items-center justify-center`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Select at least one owner. Only Admin and Member users can be owners.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              onClick={onClose}
              variant="ghost"
              disabled={loading}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !name.trim() || selectedOwnerIds.size === 0}
              className="px-4 py-2"
            >
              {loading ? 'Creating...' : 'Create workspace'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
