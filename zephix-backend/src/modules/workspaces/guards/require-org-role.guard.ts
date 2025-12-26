import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';

// For backward compatibility, accept legacy role names but map to PlatformRole
export const RequireOrgRole = (
  role: PlatformRole | 'admin' | 'project_manager' | 'viewer',
) => SetMetadata('requiredOrgRole', role);

@Injectable()
export class RequireOrgRoleGuard implements CanActivate {
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

    // Normalize user's role from JWT to PlatformRole
    const userPlatformRole = normalizePlatformRole(user.role);

    // Normalize required role (handle both new enum and legacy strings)
    const normalizedRequiredRole = normalizePlatformRole(requiredRole);

    // Development logging for role debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `Guard role check, user role: ${user.role} -> ${userPlatformRole}, required: ${requiredRole} -> ${normalizedRequiredRole}`,
      );
    }

    // Role hierarchy: ADMIN > MEMBER > VIEWER
    const roleHierarchy: Record<PlatformRole, number> = {
      [PlatformRole.ADMIN]: 3,
      [PlatformRole.MEMBER]: 2,
      [PlatformRole.VIEWER]: 1,
    };

    const userLevel = roleHierarchy[userPlatformRole] || 0;
    const requiredLevel = roleHierarchy[normalizedRequiredRole] || 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `Required platform role: ${normalizedRequiredRole}, current role: ${userPlatformRole}. Only organization admins can perform this action.`,
      );
    }

    return true;
  }
}
