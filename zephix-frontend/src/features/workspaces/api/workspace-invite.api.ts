import type { AxiosError } from 'axios';
import { api } from '@/lib/api';

export type ApiError = {
  code?: string;
  message?: string;
  statusCode?: number;
};

export type InviteLinkMeta =
  | {
      exists: true;
      expiresAt: string | null;
      createdAt: string;
    }
  | null;

export type CreateInviteLinkRequest = {
  expiresInDays?: number;
};

export type CreateInviteLinkResult = {
  url: string;
  expiresAt: string | null;
};

export type JoinWorkspaceRequest = {
  token: string;
};

export type JoinWorkspaceResult = {
  workspaceId: string;
};

function toApiError(err: unknown): ApiError {
  const e = err as AxiosError<any>;
  const statusCode = e?.response?.status;
  const data = e?.response?.data;

  if (data && (data.code || data.message)) {
    return {
      code: data.code,
      message: data.message,
      statusCode: data.statusCode ?? statusCode,
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Request failed',
    statusCode,
  };
}

export const workspaceInvitesApi = {
  async getActiveInviteLink(workspaceId: string): Promise<InviteLinkMeta> {
    try {
      // Your api.ts interceptor unwraps { data: T } into T.
      // Controller returns formatResponse(payload), so we receive payload directly.
      const res = await api.get(`/workspaces/${workspaceId}/invite-link`);
      return (res as unknown as InviteLinkMeta) ?? null;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async createInviteLink(
    workspaceId: string,
    body: CreateInviteLinkRequest = {},
  ): Promise<CreateInviteLinkResult> {
    try {
      const res = await api.post(`/workspaces/${workspaceId}/invite-link`, body);
      const data = res as unknown as CreateInviteLinkResult;
      if (!data?.url) {
        throw { code: 'INVALID_RESPONSE', message: 'Missing invite url', statusCode: 500 } satisfies ApiError;
      }
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async joinWorkspace(body: JoinWorkspaceRequest): Promise<JoinWorkspaceResult> {
    try {
      const res = await api.post('/workspaces/join', body);
      const data = res as unknown as JoinWorkspaceResult;
      if (!data?.workspaceId) {
        throw { code: 'INVALID_RESPONSE', message: 'Missing workspaceId', statusCode: 500 } satisfies ApiError;
      }
      return data;
    } catch (err) {
      throw toApiError(err);
    }
  },

  async revokeActiveInviteLink(workspaceId: string): Promise<void> {
    try {
      await api.delete(`/workspaces/${workspaceId}/invite-link/active`);
    } catch (err) {
      throw toApiError(err);
    }
  },
};
