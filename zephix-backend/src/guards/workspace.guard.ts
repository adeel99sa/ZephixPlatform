import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { WorkspacesService } from '../modules/workspaces/workspaces.service';
import { WorkspaceRole } from '../modules/workspaces/entities/user-workspace.entity';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private workspacesService: WorkspacesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const workspaceId = request.headers['x-workspace-id'] || request.workspaceId;

    if (!workspaceId) {
      return true; // No workspace context required
    }

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const role = await this.workspacesService.getUserRoleInWorkspace(userId, workspaceId);

    if (!role) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Attach role to request for further use
    request.workspaceRole = role;
    request.workspaceId = workspaceId;

    return true;
  }
}

@Injectable()
export class WorkspaceWriteGuard implements CanActivate {
  constructor(private workspacesService: WorkspacesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const workspaceId = request.headers['x-workspace-id'] || request.workspaceId;

    if (!workspaceId || !userId) {
      return false;
    }

    const role = await this.workspacesService.getUserRoleInWorkspace(userId, workspaceId);

    // Only owner, admin, and member can write
    return role === WorkspaceRole.OWNER || 
           role === WorkspaceRole.ADMIN || 
           role === WorkspaceRole.MEMBER;
  }
}





