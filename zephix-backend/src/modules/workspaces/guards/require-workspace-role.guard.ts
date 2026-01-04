import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WorkspaceAccessService } from '../../workspace-access/workspace-access.service';
import {
  REQUIRE_WORKSPACE_ROLE_KEY,
  RequireWorkspaceRoleOptions,
} from '../decorators/require-workspace-role.decorator';
import { WorkspaceRole } from '../entities/workspace.entity';
import {
  normalizePlatformRole,
  PlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';

@Injectable()
export class RequireWorkspaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessService: WorkspaceAccessService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get metadata from decorator
    const metadata = this.reflector.get<
      {
        requiredRole: WorkspaceRole;
      } & RequireWorkspaceRoleOptions
    >(REQUIRE_WORKSPACE_ROLE_KEY, context.getHandler());

    if (!metadata) {
      return true; // No role requirement
    }

    const { requiredRole, allowAdminOverride = true } = metadata;

    // Extract workspace ID from route params, query, or body
    const workspaceId =
      request.params.id ||
      request.params.workspaceId ||
      request.query.workspaceId ||
      request.body?.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID required');
    }

    const organizationId = user.organizationId;
    const userId = user.id || user.sub;
    const userRole = user.role;

    if (!organizationId || !userId) {
      throw new ForbiddenException('User context required');
    }

    // Check feature flag
    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // If feature flag is OFF, allow request (backwards compatibility)
    if (!featureEnabled) {
      return true;
    }

    // Check if user is platform admin
    // Use normalizePlatformRole and isAdminRole helper, with fallback to permissions.isAdmin
    const normalizedRole = normalizePlatformRole(userRole);
    const isAdmin =
      isAdminRole(normalizedRole) || (user.permissions?.isAdmin ?? false);

    // If admin override is enabled and user is admin, allow
    if (allowAdminOverride && isAdmin) {
      return true;
    }

    // Get user's workspace role
    const actualRole = await this.accessService.getUserWorkspaceRole(
      organizationId,
      workspaceId,
      userId,
      userRole,
    );

    // If no membership and not admin, deny
    if (!actualRole) {
      throw new ForbiddenException(
        `Access denied. Required workspace role: ${requiredRole}, but you are not a member of this workspace.`,
      );
    }

    // Check if actual role satisfies required role
    const hasAccess = this.accessService.hasWorkspaceRoleAtLeast(
      requiredRole,
      actualRole,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Insufficient workspace permissions. Required role: ${requiredRole}, your role: ${actualRole}`,
      );
    }

    // Attach workspace role to request for use in controllers
    request.workspaceRole = actualRole;

    return true;
  }
}
