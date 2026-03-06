import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../common/auth/platform-roles';

// For backward compatibility, accept legacy role names but map to PlatformRole
export const RequireOrgRole = (
  role: PlatformRole | 'admin' | 'project_manager' | 'viewer',
) => SetMetadata('requiredOrgRole', role);

@Injectable()
export class RequireOrgRoleGuard implements CanActivate {
  private readonly logger = new Logger(RequireOrgRoleGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const requiredRole = this.reflector.get<string | PlatformRole>(
      'requiredOrgRole',
      context.getHandler(),
    );

    if (!requiredRole) {
      return true; // No role requirement
    }

    // Normalize user's role from JWT to PlatformRole.
    // platformRole carries the actual org-context role (derived from UserOrganization at login).
    // user.role is the base DB field and must only be used as a fallback.
    const userPlatformRole = normalizePlatformRole(user.platformRole ?? user.role);

    // Normalize required role (handle both new enum and legacy strings)
    const normalizedRequiredRole = normalizePlatformRole(requiredRole);

    this.logger.debug(
      `RBAC check user=${user.id} platformRole=${user.platformRole} role=${user.role} resolvedRole=${userPlatformRole} required=${normalizedRequiredRole}`,
    );

    // Role hierarchy: ADMIN > MEMBER > VIEWER
    const roleHierarchy: Record<PlatformRole, number> = {
      [PlatformRole.ADMIN]: 3,
      [PlatformRole.MEMBER]: 2,
      [PlatformRole.VIEWER]: 1,
    };

    const userLevel = userPlatformRole ? (roleHierarchy[userPlatformRole] ?? 0) : 0;
    const requiredLevel = normalizedRequiredRole ? (roleHierarchy[normalizedRequiredRole] ?? 0) : 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `Required platform role: ${normalizedRequiredRole}, current role: ${userPlatformRole}. Only organization admins can perform this action.`,
      );
    }

    return true;
  }
}
