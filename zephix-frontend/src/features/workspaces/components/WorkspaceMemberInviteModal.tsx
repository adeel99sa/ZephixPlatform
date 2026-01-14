/**
 * PHASE 5.1: Workspace Member Invite Modal
 *
 * Monday-style invite modal:
 * - Search existing org users by name or email
 * - Access level selector (default Guest)
 * - Add button
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/state/AuthContext';
import { listOrgUsers } from '@/features/workspaces/workspace.api';
import { getPlatformRoleDisplay } from '@/utils/workspace-access-levels';
import { Button } from '@/components/ui/Button';

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
  onInvite: (userId: string, accessLevel: 'Owner' | 'Member' | 'Guest') => void;
  workspaceId: string;
};

export function WorkspaceMemberInviteModal({ open, onClose, onInvite, workspaceId }: Props) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<'Owner' | 'Member' | 'Guest'>('Guest');

  useEffect(() => {
    if (open) {
      loadOrgUsers();
    } else {
      // Reset state when modal closes
      setSearchTerm('');
      setSelectedUserId(null);
      setAccessLevel('Guest');
    }
  }, [open]);

  async function loadOrgUsers() {
    setLoading(true);
    try {
      const users = await listOrgUsers();
      setOrgUsers(users);
    } catch (error) {
      console.error('Failed to load org users:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = orgUsers.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      name.includes(search)
    );
  });

  function getUserName(user: OrgUser): string {
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    return user.email;
  }

  function handleInvite() {
    if (!selectedUserId) {
      alert('Please select a user');
      return;
    }
    onInvite(selectedUserId, accessLevel);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite member</h2>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {/* User List */}
          <div className="mb-4 max-h-64 overflow-y-auto border rounded-md">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? (
                  <>
                    <p>No users found</p>
                    <p className="text-xs mt-2 text-gray-400">
                      Ask an admin to invite them to the organization
                    </p>
                  </>
                ) : (
                  'No users available'
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((orgUser) => {
                  const isSelected = selectedUserId === orgUser.id;
                  const platformRole = getPlatformRoleDisplay(orgUser.role);

                  return (
                    <button
                      key={orgUser.id}
                      onClick={() => setSelectedUserId(orgUser.id)}
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
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          platformRole === 'Admin' ? 'bg-purple-100 text-purple-800' :
                          platformRole === 'Member' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {platformRole}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Access Level Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access level
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as 'Owner' | 'Member' | 'Guest')}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Owner">Owner</option>
              <option value="Member">Member</option>
              <option value="Guest">Guest</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {accessLevel === 'Owner' && 'Can manage workspace and members'}
              {accessLevel === 'Member' && 'Can create and edit work'}
              {accessLevel === 'Guest' && 'Read-only access'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              onClick={onClose}
              variant="ghost"
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!selectedUserId}
              className="px-4 py-2"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
