import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceRole } from '../entities/workspace.entity';

/**
 * Service to determine which workspaces a user can access and their roles
 * Respects feature flag ZEPHIX_WS_MEMBERSHIP_V1
 */
@Injectable()
export class WorkspaceAccessService {
  constructor(
    @InjectRepository(WorkspaceMember)
    private memberRepo: Repository<WorkspaceMember>,
    private configService: ConfigService,
  ) {}

  /**
   * Get workspace IDs that a user can access
   *
   * @param organizationId - User's organization
   * @param userId - User ID (optional, required when flag is on and user is not admin)
   * @param userRole - User's org role ('admin', 'owner', 'member', 'viewer')
   * @returns Array of workspace IDs, or null if user can access all workspaces in org
   */
  async getAccessibleWorkspaceIds(
    organizationId: string,
    userId?: string,
    userRole?: string,
  ): Promise<string[] | null> {
    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // If feature flag disabled OR user is admin/owner → can access all workspaces
    if (!featureEnabled || userRole === 'admin' || userRole === 'owner') {
      return null; // null means "all workspaces in org"
    }

    // Feature enabled and user is not admin - must filter by membership
    if (!userId) {
      return []; // Non-admin without userId sees nothing
    }

    // Get workspaces where user is a member
    const memberWorkspaces = await this.memberRepo.find({
      where: { userId },
      relations: ['workspace'],
    });

    const workspaceIds = memberWorkspaces
      .filter((m) => m.workspace?.organizationId === organizationId) // Only workspaces in user's org
      .map((m) => m.workspace?.id)
      .filter((id): id is string => !!id);

    return workspaceIds.length > 0 ? workspaceIds : [];
  }

  /**
   * Check if user can access a specific workspace
   *
   * @param workspaceId - Workspace to check
   * @param organizationId - User's organization
   * @param userId - User ID (optional, required when flag is on and user is not admin)
   * @param userRole - User's org role
   * @returns true if user can access, false otherwise
   */
  async canAccessWorkspace(
    workspaceId: string,
    organizationId: string,
    userId?: string,
    userRole?: string,
  ): Promise<boolean> {
    const accessibleIds = await this.getAccessibleWorkspaceIds(
      organizationId,
      userId,
      userRole,
    );

    // null means "all workspaces" - user can access
    if (accessibleIds === null) {
      return true;
    }

    // Check if workspaceId is in accessible list
    return accessibleIds.includes(workspaceId);
  }

  /**
   * Get user's workspace role
   *
   * @param organizationId - User's organization
   * @param workspaceId - Workspace to check
   * @param userId - User ID
   * @param userRole - User's org role ('admin', 'owner', 'member', 'viewer')
   * @returns WorkspaceRole ('owner', 'member', 'viewer') or null if no membership
   */
  async getUserWorkspaceRole(
    organizationId: string,
    workspaceId: string,
    userId: string,
    userRole?: string,
  ): Promise<WorkspaceRole | null> {
    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // If feature flag is OFF, treat everyone with workspace access as MEMBER
    // (except admin which is treated as OWNER)
    if (!featureEnabled) {
      // Check if workspace exists and belongs to org
      const canAccess = await this.canAccessWorkspace(
        workspaceId,
        organizationId,
        userId,
        userRole,
      );
      if (!canAccess) {
        return null;
      }
      // Admins are treated as owners when flag is off
      if (userRole === 'admin' || userRole === 'owner') {
        return 'owner';
      }
      // Everyone else is treated as member
      return 'member';
    }

    // Feature flag ON - check actual membership
    // Admins always have owner-level access
    if (userRole === 'admin' || userRole === 'owner') {
      return 'owner';
    }

    // Get actual workspace membership
    const member = await this.memberRepo.findOne({
      where: { workspaceId, userId },
      relations: ['workspace'],
    });

    // Verify workspace belongs to user's org
    if (!member || member.workspace?.organizationId !== organizationId) {
      return null;
    }

    return member.role;
  }

  /**
   * Check if actual role satisfies required role
   * Role hierarchy: owner > member > viewer
   *
   * @param requiredRole - Minimum required role
   * @param actualRole - User's actual role
   * @returns true if actualRole satisfies requiredRole
   */
  hasWorkspaceRoleAtLeast(
    requiredRole: WorkspaceRole,
    actualRole: WorkspaceRole | null,
  ): boolean {
    if (!actualRole) {
      return false;
    }

    const roleHierarchy: Record<WorkspaceRole, number> = {
      owner: 3,
      member: 2,
      viewer: 1,
    };

    const actualLevel = roleHierarchy[actualRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return actualLevel >= requiredLevel;
  }
}
