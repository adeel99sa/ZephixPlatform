/**
 * Guard that enforces workspace access control.
 *
 * Policy: Cross-tenant workspace access returns 403 Forbidden (not 404).
 * This provides consistent "permission denied" semantics and prevents
 * information leakage about workspace existence in other organizations.
 *
 * See: docs/PHASE2A_MIGRATION_PLAYBOOK.md for policy details.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import {
  normalizePlatformRole,
  PlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';

export const RequireWorkspaceAccess = (
  mode: 'viewer' | 'member' | 'ownerOrAdmin',
) => SetMetadata('workspaceAccessMode', mode);

@Injectable()
export class RequireWorkspaceAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private wmRepo: TenantAwareRepository<WorkspaceMember>,
    @Inject(getTenantAwareRepositoryToken(Workspace))
    private wsRepo: TenantAwareRepository<Workspace>,
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
    // TenantAwareRepository automatically scopes by organizationId from context
    const workspace = await this.wsRepo.findOne({
      where: { id: workspaceId },
      select: ['id', 'organizationId'],
    });

    if (!workspace) {
      // Workspace not found in user's organization - return 403 for security
      // (Don't leak information about workspace existence in other orgs)
      throw new ForbiddenException(
        'Workspace does not belong to your organization',
      );
    }

    // Double-check organizationId matches (defense in depth)
    if (workspace.organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'Workspace does not belong to your organization',
      );
    }

    // Check if user is org admin (admins have access to all workspaces)
    // Use normalizePlatformRole and isAdminRole helper, with fallback to permissions.isAdmin
    const userRole = user.role || 'viewer';
    const normalizedRole = normalizePlatformRole(userRole);
    const isAdmin =
      isAdminRole(normalizedRole) || (user.permissions?.isAdmin ?? false);

    if (mode === 'ownerOrAdmin' && isAdmin) {
      // Attach workspace role to request for use in controller
      request.workspaceRole = 'workspace_owner'; // Admins treated as workspace owners
      return true;
    }

    // Get user's workspace role
    const member = await this.wmRepo.findOne({
      where: { workspaceId, userId: user.id },
    });

    // PROMPT 8 A2: Block suspended members
    if (member && member.status === 'suspended') {
      throw new ForbiddenException({
        code: 'SUSPENDED',
        message: 'Access suspended',
      });
    }

    const wsRole: WorkspaceRole | null = member?.role || null;

    // Attach workspace role to request
    request.workspaceRole = wsRole;

    // Check access based on mode
    if (mode === 'viewer') {
      // All roles can view (if not suspended)
      return true;
    }

    if (mode === 'member') {
      // Workspace owner or member can access
      return wsRole === 'workspace_owner' || wsRole === 'workspace_member';
    }

    if (mode === 'ownerOrAdmin') {
      // Workspace owner or org admin can access
      return wsRole === 'workspace_owner' || isAdmin;
    }

    throw new ForbiddenException('Insufficient workspace permissions');
  }
}
