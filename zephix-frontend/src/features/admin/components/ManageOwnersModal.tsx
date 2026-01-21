/**
 * PROMPT 6: Manage Owners Modal
 *
 * Behavior:
 * - Opens from list row
 * - Loads org users list once, reuse cache if present
 * - Shows current owners preselected
 * - Saving calls updateWorkspaceOwners
 * - Enforce at least one owner in UI
 * - Error mapping uses getApiErrorMessage helper
 */
import { useState, useEffect } from 'react';
import { updateWorkspaceOwners } from '../api/adminWorkspaces.api';
import { listWorkspaceMembers } from '@/features/workspaces/workspace.api';
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
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ManageOwnersModal({ open, workspaceId, onClose, onSuccess }: Props) {
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<string>>(new Set());
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCurrentOwners();
      loadOrgUsers();
    } else {
      setSelectedOwnerIds(new Set());
      setError(null);
    }
  }, [open, workspaceId]);

  async function loadCurrentOwners() {
    try {
      const members = await listWorkspaceMembers(workspaceId);
      const ownerIds = members
        .filter(m => m.role === 'workspace_owner')
        .map(m => m.userId || m.id);
      setSelectedOwnerIds(new Set(ownerIds));
    } catch (error) {
      console.error('Failed to load current owners:', error);
      toast.error('Failed to load current owners');
    }
  }

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
      // PROMPT 6: Enforce at least one owner
      if (newSet.size === 1) {
        setError('At least one owner is required');
        return;
      }
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedOwnerIds(newSet);
    setError(null); // Clear error when selection changes
  }

  async function handleSave() {
    // PROMPT 6: Enforce at least one owner
    if (selectedOwnerIds.size === 0) {
      setError('At least one owner is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateWorkspaceOwners(workspaceId, Array.from(selectedOwnerIds));
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update owners:', error);
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manage owners</h2>

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
                      const isOnlyOwner = isSelected && selectedOwnerIds.size === 1;
                      return (
                        <button
                          key={orgUser.id}
                          onClick={() => toggleOwner(orgUser.id)}
                          disabled={isOnlyOwner}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          } ${isOnlyOwner ? 'opacity-75 cursor-not-allowed' : ''}`}
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
              At least one owner is required. Only Admin and Member users can be owners.
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
              onClick={handleSave}
              disabled={loading || selectedOwnerIds.size === 0}
              className="px-4 py-2"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
