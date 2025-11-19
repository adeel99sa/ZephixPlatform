import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor as ActorType } from '../rbac';
import { WorkspaceRole } from '../entities/workspace.entity';

export const Actor = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ActorType => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('User not found in request');
    }

    // Map user role to org role
    const userRole = user.role || 'viewer';
    const orgRole = userRole === 'owner' ? 'admin' : userRole;

    // Get workspace role from request (set by RequireWorkspaceAccessGuard)
    const wsRole: WorkspaceRole | null = request.workspaceRole || null;

    return {
      id: user.id,
      orgRole: orgRole as 'admin' | 'project_manager' | 'viewer',
      wsRole,
    };
  },
);
