import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.organizationRole;

    if (!userRole) {
      throw new ForbiddenException('User role not found in organization context');
    }

    // Role hierarchy: owner > admin > pm > viewer
    const roleHierarchy = {
      owner: 4,
      admin: 3,
      pm: 2,
      viewer: 1,
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = Math.max(...requiredRoles.map(role => roleHierarchy[role] || 0));

    if (userRoleLevel < requiredLevel) {
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}, current role: ${userRole}`,
      );
    }

    return true;
  }
}
