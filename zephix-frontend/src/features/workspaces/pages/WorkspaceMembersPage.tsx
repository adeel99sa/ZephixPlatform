/**
 * PHASE 5.1: Workspace Members Management Page
 *
 * Modern members management aligned with workspace access levels.
 *
 * Features:
 * - Members table with platform role badges and workspace access levels
 * - Invite modal for adding existing org users
 * - Access level dropdown (Owner only)
 * - Last owner protection
 * - Guest users forced to Viewer
 */
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/state/workspace.store';
import { useAuth } from '@/state/AuthContext';
import { useWorkspacePermissions } from '@/hooks/useWorkspacePermissions';
import {
  listWorkspaceMembers,
  addWorkspaceMember,
  changeWorkspaceRole,
  removeWorkspaceMember,
  listOrgUsers,
  suspendWorkspaceMember,
  reinstateWorkspaceMember,
  WorkspaceMember,
} from '@/features/workspaces/workspace.api';
import { mapRoleToAccessLevel, mapAccessLevelToRole, getPlatformRoleDisplay } from '@/utils/workspace-access-levels';
import { Button } from '@/components/ui/Button';
import { WorkspaceMemberInviteModal } from '@/features/workspaces/components/WorkspaceMemberInviteModal';
import InviteLinkModal from '@/features/workspaces/components/InviteLinkModal';
import { SuspendedAccessScreen } from '@/components/workspace/SuspendedAccessScreen';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';

// Use the Member type from workspace.api.ts
type Member = WorkspaceMember & {
  userId: string;  // Required in this context
  role: string;    // Required in this context
};

type OrgUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

export default function WorkspaceMembersPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const permissions = useWorkspacePermissions();

  // Use active workspace ID from store, fallback to URL param
  const effectiveWorkspaceId = activeWorkspaceId || workspaceId;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLinkModalOpen, setInviteLinkModalOpen] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [suspendingMember, setSuspendingMember] = useState<string | null>(null);
  const [reinstatingMember, setReinstatingMember] = useState<string | null>(null);
  const [ownerCount, setOwnerCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const canManage = permissions.canManageMembers;

  const filteredMembers = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    const q = (searchQuery || '').trim().toLowerCase();
    const status = statusFilter;
    
    let filtered = list;
    
    if (q) {
      filtered = filtered.filter((m) => {
        const email = (m?.user?.email || m?.email || '').toLowerCase();
        const name = getMemberName(m).toLowerCase();
        return email.includes(q) || name.includes(q);
      });
    }
    
    if (status !== 'all') {
      filtered = filtered.filter((m) => {
        const memberStatus = m.status || 'active';
        return memberStatus === status;
      });
    }
    
    return filtered;
  }, [members, searchQuery, statusFilter]);

  useEffect(() => {
    if (!effectiveWorkspaceId) {
      setLoading(false);
      return;
    }
    loadMembers();
  }, [effectiveWorkspaceId]);

  async function loadMembers() {
    if (!effectiveWorkspaceId) return;

    setLoading(true);
    setIsSuspended(false);
    try {
      const mems = await listWorkspaceMembers(effectiveWorkspaceId);
      setMembers(mems as Member[]);

      // Count owners for last owner protection
      const owners = mems.filter(m => m.role === 'workspace_owner');
      setOwnerCount(owners.length);
    } catch (error: any) {
      console.error('Failed to load members:', error);
      // PROMPT 8 B3: Check for SUSPENDED error code
      if (error?.response?.status === 403 && error?.response?.data?.code === 'SUSPENDED') {
        setIsSuspended(true);
      } else {
        toast.error('Failed to load members');
      }
    } finally {
      setLoading(false);
    }
  }


  async function handleAddMember(userId: string, accessLevel: 'Owner' | 'Member' | 'Guest') {
    if (!effectiveWorkspaceId) return;

    try {
      const role = mapAccessLevelToRole(accessLevel);
      await addWorkspaceMember(effectiveWorkspaceId, userId, role as any);
      toast.success('Member added successfully');
      setShowInviteModal(false);
      await loadMembers();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const message = error?.response?.data?.message || 'Failed to add member';
      toast.error(message);
    }
  }

  async function handleChangeRole(memberId: string, userId: string, newAccessLevel: 'Owner' | 'Member' | 'Guest') {
    if (!effectiveWorkspaceId) return;

    setChangingRole(memberId);
    try {
      // PROMPT 6 C1: Map UI access levels to internal roles
      // Owner -> workspace_owner
      // Member -> workspace_member
      // Guest -> workspace_viewer
      const role = mapAccessLevelToRole(newAccessLevel);
      await changeWorkspaceRole(effectiveWorkspaceId, userId, role as any);
      toast.success('Access level updated');
      await loadMembers();
    } catch (error: any) {
      console.error('Failed to change role:', error);
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.message;
      const displayMessage = getApiErrorMessage({ code: errorCode, message: errorMessage });
      toast.error(displayMessage);
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemoveMember(memberId: string, userId: string, memberRole: string) {
    if (!effectiveWorkspaceId) return;

    // Last owner protection
    if (memberRole === 'workspace_owner' && ownerCount === 1) {
      toast.error('Cannot remove the last workspace owner');
      return;
    }

    if (!confirm('Are you sure you want to remove this member?')) {
      return;
    }

    setRemovingMember(memberId);
    try {
      await removeWorkspaceMember(effectiveWorkspaceId, userId);
      toast.success('Member removed');
      await loadMembers();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      const message = error?.response?.data?.message || 'Failed to remove member';
      toast.error(message);
    } finally {
      setRemovingMember(null);
    }
  }

  async function handleSuspendMember(memberId: string) {
    if (!effectiveWorkspaceId) return;

    setSuspendingMember(memberId);
    try {
      await suspendWorkspaceMember(effectiveWorkspaceId, memberId);
      toast.success('Member suspended');
      await loadMembers();
      setActionMenuOpen(null);
    } catch (error: unknown) {
      console.error('Failed to suspend member:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || 'Failed to suspend member';
      toast.error(message);
    } finally {
      setSuspendingMember(null);
    }
  }

  async function handleReinstateMember(memberId: string) {
    if (!effectiveWorkspaceId) return;

    setReinstatingMember(memberId);
    try {
      await reinstateWorkspaceMember(effectiveWorkspaceId, memberId);
      toast.success('Member reinstated');
      await loadMembers();
      setActionMenuOpen(null);
    } catch (error: unknown) {
      console.error('Failed to reinstate member:', error);
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || 'Failed to reinstate member';
      toast.error(message);
    } finally {
      setReinstatingMember(null);
    }
  }

  function getMemberName(member: Member): string {
    if (member.name) return member.name;
    if (member.user?.firstName || member.user?.lastName) {
      return [member.user.firstName, member.user.lastName].filter(Boolean).join(' ');
    }
    return member.user?.email || member.email || 'Unknown';
  }

  function getMemberEmail(member: Member): string {
    return member.user?.email || member.email || '';
  }

  function getMemberPlatformRole(member: Member): string {
    // Platform role should come from user organization
    // Backend includes user relation, but we may need to fetch org role separately
    // For now, default to 'member' if not available
    // TODO: Backend should include platform role in member response
    return 'member'; // Will be enhanced when backend includes platform role
  }

  if (!effectiveWorkspaceId) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>No workspace selected</p>
        </div>
      </div>
    );
  }

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuOpen && !(event.target as Element).closest('.relative')) {
        setActionMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuOpen]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Loading members...</div>
      </div>
    );
  }

  // PROMPT 8 B3: Show suspended screen if access is suspended
  if (isSuspended) {
    return <SuspendedAccessScreen />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" data-testid="workspace-members-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            People with access to this workspace
          </p>
          {canManage ? (
            <p className="text-xs text-gray-400 mt-1">
              You manage access for this workspace
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Read only access
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button
              onClick={() => setInviteLinkModalOpen(true)}
              variant="outline"
              className="px-4 py-2"
            >
              Invite Link
            </Button>
            <Button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2"
            >
              Invite
            </Button>
          </div>
        )}
      </div>


      {/* PROMPT 8 B2: Filters */}
      <div className="mb-4 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
          className="px-3 py-2 border rounded-md text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Members Table */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500 mb-4">No members yet</p>
          {canManage && (
            <Button onClick={() => setShowInviteModal(true)}>
              Invite members
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Platform role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Access</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                {canManage && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => {
                const accessLevel = mapRoleToAccessLevel(member.role as any);
                const platformRole = getPlatformRoleDisplay(getMemberPlatformRole(member));
                const isLastOwner = member.role === 'workspace_owner' && ownerCount === 1;
                const isChanging = changingRole === member.id;
                const isRemoving = removingMember === member.id;

                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getMemberName(member)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getMemberEmail(member)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        platformRole === 'Admin' ? 'bg-purple-100 text-purple-800' :
                        platformRole === 'Member' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {platformRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={accessLevel}
                          onChange={(e) => {
                            const newLevel = e.target.value as 'Owner' | 'Member' | 'Guest';
                            // Prevent demoting last owner
                            if (member.role === 'workspace_owner' && newLevel !== 'Owner' && ownerCount === 1) {
                              toast.error('Cannot demote the last workspace owner');
                              return;
                            }
                            handleChangeRole(member.id, member.userId, newLevel);
                          }}
                          disabled={isChanging || isLastOwner}
                          className="text-sm border rounded px-2 py-1 disabled:opacity-50"
                        >
                          <option value="Owner">Owner</option>
                          <option value="Member">Member</option>
                          <option value="Guest">Guest</option>
                        </select>
                      ) : (
                        <span className="text-sm text-gray-700">{accessLevel}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        (member.status || 'active') === 'suspended'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                            className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                            disabled={removingMember === member.id || suspendingMember === member.id || reinstatingMember === member.id}
                          >
                            ⋮
                          </button>
                          {actionMenuOpen === member.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                              {member.status === 'suspended' ? (
                                <button
                                  onClick={() => handleReinstateMember(member.id)}
                                  disabled={reinstatingMember === member.id}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                  {reinstatingMember === member.id ? 'Reinstating...' : 'Reinstate member'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSuspendMember(member.id)}
                                  disabled={suspendingMember === member.id}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                  {suspendingMember === member.id ? 'Suspending...' : 'Suspend member'}
                                </button>
                              )}
                              <div className="border-t border-gray-200 my-1"></div>
                              <button
                                onClick={() => {
                                  handleRemoveMember(member.id, member.userId || '', member.role || '');
                                  setActionMenuOpen(null);
                                }}
                                disabled={removingMember === member.id || isLastOwner}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {removingMember === member.id ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <WorkspaceMemberInviteModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleAddMember}
          workspaceId={effectiveWorkspaceId}
        />
      )}

      {/* Invite Link Modal */}
      {effectiveWorkspaceId && (
        <InviteLinkModal
          open={inviteLinkModalOpen}
          workspaceId={effectiveWorkspaceId}
          onClose={() => setInviteLinkModalOpen(false)}
        />
      )}
    </div>
  );
}
