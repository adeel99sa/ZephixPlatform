/**
 * PROMPT 7: Workspace Invite API
 *
 * Functions for workspace invite links and joining
 */
import { api } from '@/lib/api';
import { unwrapData } from '@/lib/api/unwrapData';

type CreateInviteLinkResponse = {
  url: string;
  expiresAt: Date | null;
};

type JoinWorkspaceResponse = {
  workspaceId: string;
};

/**
 * Create invite link for workspace
 * POST /api/workspaces/:id/invite-link
 */
export async function createInviteLink(
  workspaceId: string,
  expiresInDays?: number
): Promise<CreateInviteLinkResponse> {
  try {
    const response = await api.post<{ data: CreateInviteLinkResponse }>(
      `/workspaces/${workspaceId}/invite-link`,
      { expiresInDays }
    );
    return unwrapData<CreateInviteLinkResponse>(response) || { url: '', expiresAt: null };
  } catch (error) {
    console.error('Failed to create invite link:', error);
    throw error;
  }
}

/**
 * Get active invite link for workspace
 * GET /api/workspaces/:id/invite-link
 */
export async function getActiveInviteLink(workspaceId: string): Promise<{
  exists: boolean;
  expiresAt: Date | null;
  createdAt: Date;
} | null> {
  try {
    const response = await api.get<{ data: any }>(
      `/workspaces/${workspaceId}/invite-link`
    );
    return unwrapData(response);
  } catch (error) {
    console.error('Failed to get invite link:', error);
    return null;
  }
}

/**
 * Revoke invite link
 * DELETE /api/workspaces/:id/invite-link/:linkId
 */
export async function revokeInviteLink(
  workspaceId: string,
  linkId: string
): Promise<void> {
  try {
    await api.delete(`/workspaces/${workspaceId}/invite-link/${linkId}`);
  } catch (error) {
    console.error('Failed to revoke invite link:', error);
    throw error;
  }
}

/**
 * Join workspace using invite token
 * POST /api/workspaces/join
 */
export async function joinWorkspace(token: string): Promise<JoinWorkspaceResponse> {
  try {
    const response = await api.post<{ data: JoinWorkspaceResponse }>(
      '/workspaces/join',
      { token }
    );
    return unwrapData<JoinWorkspaceResponse>(response) || { workspaceId: '' };
  } catch (error) {
    console.error('Failed to join workspace:', error);
    throw error;
  }
}
