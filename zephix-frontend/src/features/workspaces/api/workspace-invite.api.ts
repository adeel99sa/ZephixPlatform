/**
 * Workspace Invite API
 *
 * Matches backend behavior exactly:
 * - GET /workspaces/:id/invite-link returns metadata only (no URL)
 * - POST /workspaces/:id/invite-link returns URL only at creation
 * - POST /workspaces/join requires auth (returns 401 if not logged in)
 *
 * Envelope handling:
 * - src/lib/api.ts interceptor already unwraps { data: T } to T
 * - So response is already the inner data, no need to unwrap again
 */
import { api } from '@/lib/api';
import { AxiosError } from 'axios';

// Types matching backend exactly
export type InviteLinkMeta = {
  exists: true;
  expiresAt: string | null;   // ISO string
  createdAt: string;           // ISO string
};

export type CreateInviteLinkRequest = {
  expiresInDays?: number;     // optional, 1-365
};

export type CreateInviteLinkResult = {
  url: string;                // full URL with token
  expiresAt: string | null;   // ISO string or null
};

export type JoinWorkspaceRequest = {
  token: string;
};

export type JoinWorkspaceResult = {
  workspaceId: string;
};

export type ApiError = {
  code?: string;
  message?: string;
  statusCode?: number;
};

// Error helper - extracts structured error from axios error
function toApiError(e: unknown): ApiError {
  const err = e as AxiosError<any>;
  const data = err?.response?.data;
  if (data?.code || data?.message) {
    return { ...data, statusCode: err.response?.status };
  }
  return {
    code: 'UNKNOWN',
    message: 'Request failed',
    statusCode: err.response?.status,
  };
}

/**
 * Get active invite link metadata
 * GET /api/workspaces/:id/invite-link
 *
 * Returns metadata only (exists, expiresAt, createdAt)
 * Does NOT return URL or token for security
 *
 * Response: null or { exists: true, expiresAt: string | null, createdAt: string }
 */
export async function getActiveInviteLink(
  workspaceId: string
): Promise<InviteLinkMeta | null> {
  try {
    // API interceptor already unwraps { data: T } to T
    // So response is directly InviteLinkMeta | null
    const response = await api.get<InviteLinkMeta | null>(
      `/workspaces/${workspaceId}/invite-link`
    );
    return response ?? null;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * Create invite link
 * POST /api/workspaces/:id/invite-link
 *
 * Returns URL and expiresAt only at creation time
 * Store URL in component state (memory only)
 *
 * Response: { url: string, expiresAt: string | null }
 */
export async function createInviteLink(
  workspaceId: string,
  body: CreateInviteLinkRequest = {}
): Promise<CreateInviteLinkResult> {
  try {
    // API interceptor already unwraps { data: T } to T
    // So response is directly CreateInviteLinkResult
    const response = await api.post<CreateInviteLinkResult>(
      `/workspaces/${workspaceId}/invite-link`,
      body
    );
    if (!response?.url) {
      throw new Error('Create invite link returned no URL');
    }
    return response;
  } catch (e) {
    throw toApiError(e);
  }
}

/**
 * Join workspace
 * POST /api/workspaces/join
 *
 * Requires authentication
 * Returns 401 UNAUTHENTICATED if not logged in
 *
 * Response: { workspaceId: string }
 */
export async function joinWorkspace(
  body: JoinWorkspaceRequest
): Promise<JoinWorkspaceResult> {
  try {
    // API interceptor already unwraps { data: T } to T
    // So response is directly JoinWorkspaceResult
    const response = await api.post<JoinWorkspaceResult>(
      '/workspaces/join',
      body
    );
    if (!response?.workspaceId) {
      throw new Error('Join workspace returned no workspaceId');
    }
    return response;
  } catch (e) {
    // Re-throw with structured error for UI handling
    throw toApiError(e);
  }
}
