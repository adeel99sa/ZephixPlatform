import { UnauthorizedException } from '@nestjs/common';
import { AuthRequest } from './auth-request';

export function getAuthContext(req: AuthRequest) {
  const user = req.user;
  if (!user?.id) {
    throw new UnauthorizedException('Missing user');
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

export function getAuthContextOptional(req: AuthRequest) {
  const user = req.user;
  return {
    userId: user?.id ?? null,
    organizationId: user?.organizationId ?? null,
    workspaceId: user?.workspaceId ?? null,
    roles: user?.roles ?? [],
    email: user?.email ?? null,
    platformRole: user?.platformRole || user?.role || null,
  };
}
