import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    // ENTERPRISE APPROACH: No repository injection to avoid circular dependencies
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Extract organization ID from headers or query params
    const headerOrgId = request.headers['x-org-id'] as string;
    const organizationId =
      headerOrgId ||
      request.params.organizationId ||
      request.params.id ||
      (request.query.organizationId as string) ||
      user?.defaultOrganizationId ||
      user?.organizationId;

    // If no organizationId provided, throw error
    if (!organizationId) {
      throw new ForbiddenException('Organization context required');
    }

    // ENTERPRISE APPROACH: Validate from JWT claims and user object instead of database query
    // This eliminates database calls and dependency injection issues
    const hasAccess = this.validateUserOrganizationAccess(user, organizationId);

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied for organization: ${organizationId}`,
      );
    }

    // Store organization context in request for controllers to use
    request.organizationId = organizationId;
    request.userOrganization = this.getUserOrganizationFromClaims(
      user,
      organizationId,
    );
    request.organizationRole = this.getUserRoleFromClaims(user, organizationId);

    return true;
  }

  private extractOrganizationId(request: Request): string | null {
    // Priority order: params > headers > query > body
    return (
      request.params?.organizationId ||
      (request.headers['x-org-id'] as string) ||
      (request.query?.organizationId as string) ||
      request.body?.organizationId
    );
  }

  private validateUserOrganizationAccess(
    user: any,
    organizationId: string,
  ): boolean {
    // Check if user has direct organization access
    if (user.organizationId === organizationId) {
      return true;
    }

    // Check if user has access through organizations array (from JWT claims)
    if (user.organizations && Array.isArray(user.organizations)) {
      return user.organizations.some(
        (org: any) =>
          org.id === organizationId || org.organizationId === organizationId,
      );
    }

    // Check if user has access through userOrganizations array
    if (user.userOrganizations && Array.isArray(user.userOrganizations)) {
      return user.userOrganizations.some(
        (userOrg: any) =>
          userOrg.organizationId === organizationId &&
          userOrg.isActive !== false,
      );
    }

    return false;
  }

  private getUserOrganizationFromClaims(
    user: any,
    organizationId: string,
  ): any {
    // Try to get from userOrganizations array first
    if (user.userOrganizations && Array.isArray(user.userOrganizations)) {
      return user.userOrganizations.find(
        (userOrg: any) => userOrg.organizationId === organizationId,
      );
    }

    // Fallback to organizations array
    if (user.organizations && Array.isArray(user.organizations)) {
      const org = user.organizations.find(
        (org: any) =>
          org.id === organizationId || org.organizationId === organizationId,
      );

      if (org) {
        return {
          organizationId: org.id || org.organizationId,
          role: org.role || 'member',
          isActive: org.isActive !== false,
        };
      }
    }

    // Default fallback
    return {
      organizationId,
      role: user.role || 'member',
      isActive: true,
    };
  }

  private getUserRoleFromClaims(user: any, organizationId: string): string {
    const userOrg = this.getUserOrganizationFromClaims(user, organizationId);
    return userOrg?.role || user.role || 'member';
  }
}
