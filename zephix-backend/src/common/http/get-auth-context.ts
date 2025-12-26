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
