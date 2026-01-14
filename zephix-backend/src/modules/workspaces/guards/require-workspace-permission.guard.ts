import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspacePermissionService } from '../services/workspace-permission.service';
import { REQUIRE_WORKSPACE_PERMISSION_KEY } from '../decorators/require-workspace-permission.decorator';

@Injectable()
export class RequireWorkspacePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: WorkspacePermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAction = this.reflector.get<string>(
      REQUIRE_WORKSPACE_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredAction) {
      // No permission requirement, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const workspaceId = request.params.id || request.params.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID required');
    }

    const userContext = {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role || 'viewer',
    };

    const isAllowed = await this.permissionService.isAllowed(
      userContext,
      workspaceId,
      requiredAction as any,
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        `Permission denied: ${requiredAction} required`,
      );
    }

    return true;
  }
}
