import { UnauthorizedException } from '@nestjs/common';
import { AuthRequest } from './auth-request';

export function getAuthContext(req: AuthRequest) {
  const user: any = req.user;

  const userId = user?.id ?? user?.userId ?? user?.sub ?? null;
  if (!userId) {
    throw new UnauthorizedException('Missing user');
  }

  return {
    userId,
    organizationId: user?.organizationId ?? user?.orgId ?? null,
    workspaceId: user?.workspaceId ?? null,
    roles: user?.roles ?? [],
    email: user?.email ?? null,
    platformRole: user?.platformRole || user?.role || null,
  };
}

export function getAuthContextOptional(req: AuthRequest) {
  const user: any = req.user;
  const userId = user?.id ?? user?.userId ?? user?.sub ?? null;

  return {
    userId,
    organizationId: user?.organizationId ?? user?.orgId ?? null,
    workspaceId: user?.workspaceId ?? null,
    roles: user?.roles ?? [],
    email: user?.email ?? null,
    platformRole: user?.platformRole || user?.role || null,
  };
}
