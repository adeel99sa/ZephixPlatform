import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor as ActorType } from '../rbac';
import { WorkspaceRole } from '../entities/workspace.entity';
import {
  PlatformRole,
  normalizePlatformRole,
} from '../../../shared/enums/platform-roles.enum';

export const Actor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ActorType => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('User not found in request');
    }

    // Normalize user role to PlatformRole, then map to legacy OrgRole for Actor interface
    // This maintains backward compatibility while using the new role system
    const userPlatformRole = normalizePlatformRole(user.role);

    // Map PlatformRole to legacy OrgRole format for Actor interface
    // ADMIN -> 'admin', MEMBER -> 'project_manager', VIEWER -> 'viewer'
    const orgRole: 'admin' | 'project_manager' | 'viewer' =
      userPlatformRole === PlatformRole.ADMIN
        ? 'admin'
        : userPlatformRole === PlatformRole.MEMBER
          ? 'project_manager'
          : 'viewer';

    // Get workspace role from request (set by RequireWorkspaceAccessGuard)
    const wsRole: WorkspaceRole | null = request.workspaceRole || null;

    return {
      id: user.id,
      orgRole,
      wsRole,
    };
  },
);
