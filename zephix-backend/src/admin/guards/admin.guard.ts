import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { normalizePlatformRole, PlatformRole } from '../../common/auth/platform-roles';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Resolve using platformRole (org-context) with fallback to legacy role field.
    // Email-based bypass removed — identity must be expressed via role, not email address.
    const normalizedRole = normalizePlatformRole(user.platformRole ?? user.role);
    return normalizedRole === PlatformRole.ADMIN;
  }
}
