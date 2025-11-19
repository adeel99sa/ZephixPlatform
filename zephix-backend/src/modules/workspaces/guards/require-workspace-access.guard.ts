import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceRole } from '../entities/workspace.entity';

export const RequireWorkspaceAccess = (
  mode: 'viewer' | 'member' | 'ownerOrAdmin',
) => SetMetadata('workspaceAccessMode', mode);

@Injectable()
export class RequireWorkspaceAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(WorkspaceMember)
    private wmRepo: Repository<WorkspaceMember>,
    @InjectRepository(Workspace)
    private wsRepo: Repository<Workspace>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const mode = this.reflector.get<string>(
      'workspaceAccessMode',
      context.getHandler(),
    );

    if (!mode) {
      return true; // No access requirement
    }

    const workspaceId = request.params.id || request.params.workspaceId;
    if (!workspaceId) {
      throw new NotFoundException('Workspace ID required');
    }

    // Verify workspace exists and belongs to user's organization
    const workspace = await this.wsRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'organizationId'],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'Workspace does not belong to your organization',
      );
    }

    // Check if user is org admin (admins have access to all workspaces)
    const userRole = user.role || 'viewer';
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    if (mode === 'ownerOrAdmin' && isAdmin) {
      // Attach workspace role to request for use in controller
      request.workspaceRole = 'owner'; // Admins treated as owners
      return true;
    }

    // Get user's workspace role
    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId: user.id },
    });

    const wsRole: WorkspaceRole | null = member?.role || null;

    // Attach workspace role to request
    request.workspaceRole = wsRole;

    // Check access based on mode
    if (mode === 'viewer') {
      // All roles can view
      return true;
    }

    if (mode === 'member') {
      // Owner or member can access
      return wsRole === 'owner' || wsRole === 'member';
    }

    if (mode === 'ownerOrAdmin') {
      // Owner or admin can access
      return wsRole === 'owner' || isAdmin;
    }

    throw new ForbiddenException('Insufficient workspace permissions');
  }
}
