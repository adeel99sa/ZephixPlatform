import type { AxiosError } from 'axios';
import { api } from '@/lib/api';

export type ApiError = {
  code?: string;
  message?: string;
  statusCode?: number;
};

export type ValidateInviteResponse = {
  email: string;
  role: string;
  orgName: string;
  expiresAt: string;
};

export type AcceptInviteRequest = {
  token: string;
  fullName: string;
  password: string;
};

export type AcceptInviteResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    platformRole: string;
    permissions: {
      isAdmin?: boolean;
      canManageUsers?: boolean;
      canViewProjects?: boolean;
      canManageResources?: boolean;
      canViewAnalytics?: boolean;
    };
    organizationId: string;
    organization?: {
      id: string;
      name: string;
      slug: string;
      features?: Record<string, any>;
    } | null;
  };
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  organizationId: string;
  expiresIn: number;
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

export const orgInvitesApi = {
  /**
   * Validate an invite token
   * Returns invite details or throws with ORG_INVITE_NOT_FOUND
   */
  async validateInvite(token: string): Promise<ValidateInviteResponse> {
    try {
      // API interceptor unwraps { data: T } into T, so response is already the data
      const res = await api.get<ValidateInviteResponse>('/org-invites/validate', {
        params: { token },
      });
      return res;
    } catch (err) {
      throw toApiError(err);
    }
  },

  /**
   * Accept an invite and create user account
   * Returns auth payload identical to login response
   */
  async acceptInvite(payload: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    try {
      // API interceptor unwraps { data: T } into T, so response is already the data
      const res = await api.post<AcceptInviteResponse>('/org-invites/accept', payload);
      return res;
    } catch (err) {
      throw toApiError(err);
    }
  },
};
