import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { normalizePlatformRole } from '../../shared/enums/platform-roles.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Check if user is admin or owner (both have admin privileges)
    // Support both legacy role strings and new PlatformRole enum
    const normalizedRole = normalizePlatformRole(
      user.platformRole || user.role,
    );
    const isAdmin =
      user.email === 'admin@zephix.ai' ||
      normalizedRole === 'ADMIN' ||
      user.role === 'admin' ||
      user.role === 'owner';

    return isAdmin;
  }
}
