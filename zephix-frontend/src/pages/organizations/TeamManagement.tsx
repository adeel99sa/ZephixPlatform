import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/state/AuthContext';
import { apiClient } from '@/lib/api/client';
import {
  UserPlus,
  Users,
  Mail,
  Shield,
  MoreHorizontal,
  Check,
  X,
  Crown,
  Settings as SettingsIcon,
  Eye,
  ClipboardList
} from 'lucide-react';

interface TeamMember {
  id: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  role: 'owner' | 'admin' | 'pm' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  lastActive?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: 'admin' | 'pm' | 'viewer';
  invitedBy: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-blue-100 text-blue-800 border-blue-200',
  pm: 'bg-green-100 text-green-800 border-green-200',
  viewer: 'bg-gray-100 text-gray-800 border-gray-200'
};

const ROLE_ICONS = {
  owner: Crown,
  admin: SettingsIcon,
  pm: ClipboardList,
  viewer: Eye
};

const ROLE_DESCRIPTIONS = {
  owner: 'Full access to all features and settings',
  admin: 'Manage team members and organization settings',
  pm: 'Create and manage projects, view reports',
  viewer: 'View projects and reports only'
};

export const TeamManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'pm' | 'viewer'>('pm');
  const [isLoading, setIsLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  useEffect(() => {
    if (organizationId) {
      loadTeamData();
    }
  }, [organizationId]);

  const loadTeamData = async () => {
    if (!organizationId) {
      toast.error('Organization context required');
      return;
    }

    setIsLoading(true);
    try {
      // Load team members
      const membersResponse = await apiClient.get(`/organizations/${organizationId}/team/members`);
      const members = Array.isArray(membersResponse.data) ? membersResponse.data : [];
      setTeamMembers(members.map((m: any) => ({
        ...m,
        name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || m.user?.email || 'Unknown',
        email: m.user?.email || '',
        joinedAt: m.joinedAt || new Date().toISOString(),
      })));

      // Load pending invitations
      const invitationsResponse = await apiClient.get(`/organizations/${organizationId}/team/invitations`);
      const invitations = Array.isArray(invitationsResponse.data) ? invitationsResponse.data : [];
      setPendingInvitations(invitations.map((inv: any) => ({
        ...inv,
        invitedBy: inv.invitedBy?.firstName
          ? `${inv.invitedBy.firstName} ${inv.invitedBy.lastName || ''}`.trim()
          : inv.invitedBy?.email || 'Unknown',
      })));
    } catch (error: any) {
      console.error('Failed to load team data:', error);
      toast.error(error?.response?.data?.message || 'Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!organizationId) {
      toast.error('Organization context required');
      return;
    }

    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!inviteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post(`/organizations/${organizationId}/team/invite`, {
        email: inviteEmail,
        role: inviteRole,
      });

      if (response.data?.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setShowInviteModal(false);
        loadTeamData(); // Reload to show new invitation
      }
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      toast.error(error?.response?.data?.message || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!organizationId) return;

    try {
      const response = await apiClient.post(
        `/organizations/${organizationId}/team/invitations/${invitationId}/resend`
      );
      if (response.data?.success) {
        toast.success('Invitation resent successfully');
      }
    } catch (error: any) {
      console.error('Failed to resend invitation:', error);
      toast.error(error?.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!organizationId) return;

    try {
      const response = await apiClient.delete(
        `/organizations/${organizationId}/team/invitations/${invitationId}`
      );
      if (response.data?.success) {
        toast.success('Invitation cancelled');
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      }
    } catch (error: any) {
      console.error('Failed to cancel invitation:', error);
      toast.error(error?.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return 'Never';

    const now = new Date();
    const activeDate = new Date(lastActive);
    const diff = now.getTime() - activeDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getRoleBadge = (role: TeamMember['role']) => {
    const Icon = ROLE_ICONS[role];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[role]}`}>
        <Icon className="w-3 h-3" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Organization context required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">Team Management</h1>
              </div>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading team data...</div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Team Members */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Team Members ({teamMembers.length})</h2>
              </div>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getRoleBadge(member.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            member.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatLastActive(member.lastActive)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-gray-400 hover:text-gray-500">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Pending Invitations ({pendingInvitations.length})</h2>
                </div>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invited By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invited
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expires
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingInvitations.map((invitation) => (
                        <tr key={invitation.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(invitation.role)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {typeof invitation.invitedBy === 'string' ? invitation.invitedBy : invitation.invitedBy?.email || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invitation.invitedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleResendInvitation(invitation.id)}
                                className="text-indigo-600 hover:text-indigo-900 text-xs"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-900 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Invite Team Member</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'pm' | 'viewer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="pm">Project Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
