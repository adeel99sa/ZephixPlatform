export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    organizationId: string | null;
    role: string;
    permissions: {
      canViewProjects: boolean;
      canManageResources: boolean;
      canViewAnalytics: boolean;
      canManageUsers: boolean;
      isAdmin: boolean;
    };
  };
  ip: string;
  headers: {
    'user-agent'?: string;
    'x-request-id'?: string;
  };
}
