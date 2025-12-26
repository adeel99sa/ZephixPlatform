import { AuthRequest } from './auth-request';

/**
 * Optional version of getAuthContext for interceptors/middleware
 * that need to handle unauthenticated routes gracefully.
 * Returns null if user is missing instead of throwing.
 */
export function getAuthContextOptional(req: AuthRequest) {
  const user = req.user;
  if (!user?.id) {
    return null;
  }
  return {
    userId: user.id,
    organizationId: user.organizationId,
    workspaceId: user.workspaceId,
    roles: user.roles ?? [],
    email: user.email,
    platformRole: user.platformRole || user.role,
  };
}
