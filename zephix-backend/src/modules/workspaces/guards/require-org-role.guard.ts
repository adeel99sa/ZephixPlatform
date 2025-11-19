import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RequireOrgRole = (role: 'admin' | 'project_manager' | 'viewer') =>
  SetMetadata('requiredOrgRole', role);

@Injectable()
export class RequireOrgRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const requiredRole = this.reflector.get<string>(
      'requiredOrgRole',
      context.getHandler(),
    );

    if (!requiredRole) {
      return true; // No role requirement
    }

    // Map user role to org role
    const userRole = user.role || 'viewer';
    const orgRole = userRole === 'owner' ? 'admin' : userRole;

    // Role hierarchy: admin > project_manager > viewer
    const roleHierarchy = {
      admin: 3,
      project_manager: 2,
      viewer: 1,
    };

    const userLevel = roleHierarchy[orgRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `Required role: ${requiredRole}, current role: ${orgRole}`,
      );
    }

    return true;
  }
}
