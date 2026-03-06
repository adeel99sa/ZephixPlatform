import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { normalizePlatformRole, PlatformRole } from './platform-roles';

/**
 * PlatformAdminGuard — single canonical guard for admin-only endpoints.
 *
 * Replaces AdminGuard / AdminOnlyGuard variants that had inconsistent
 * implementations (email hardcode, wrong role field, etc.).
 *
 * Resolution order: user.platformRole ?? user.role
 * Throws 401 when no user is present, 403 when role < ADMIN.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const role = normalizePlatformRole(user.platformRole ?? user.role);

    if (role !== PlatformRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
