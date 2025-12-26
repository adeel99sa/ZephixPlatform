import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import {
  PlatformRole,
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import { TenantAwareRepository } from '../../tenancy/tenant-aware.repository';
import { getTenantAwareRepositoryToken } from '../../tenancy/tenant-aware.repository';
import { TenantContextService } from '../../tenancy/tenant-context.service';

/**
 * Service to determine which workspaces a user can access and their roles
 * Respects feature flag ZEPHIX_WS_MEMBERSHIP_V1
 */
@Injectable()
export class WorkspaceAccessService {
  constructor(
    @Inject(getTenantAwareRepositoryToken(WorkspaceMember))
    private memberRepo: TenantAwareRepository<WorkspaceMember>,
    private configService: ConfigService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * Get workspace IDs that a user can access
   *
   * @param organizationId - User's organization
   * @param userId - User ID (optional, required when flag is on and user is not ADMIN)
   * @param platformRole - User's platform role (ADMIN, MEMBER, VIEWER) - can be string for backward compatibility
   * @returns Array of workspace IDs, or null if user can access all workspaces in org
   */
  async getAccessibleWorkspaceIds(
    organizationId: string,
    userId?: string,
    platformRole?: string | PlatformRole,
  ): Promise<string[] | null> {
    // organizationId now comes from tenant context
    const orgId = this.tenantContextService.assertOrganizationId();

    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // Normalize platform role
    const normalizedRole = normalizePlatformRole(platformRole);

    // If feature flag disabled OR user is platform ADMIN → can access all workspaces
    if (!featureEnabled || normalizedRole === PlatformRole.ADMIN) {
      return null; // null means "all workspaces in org"
    }

    // Feature enabled and user is not admin - must filter by membership
    if (!userId) {
      return []; // Non-admin without userId sees nothing
    }

    // Get workspaces where user is a member
    // TenantAwareRepository automatically scopes by organizationId
    const memberWorkspaces = await this.memberRepo.find({
      where: { userId },
      relations: ['workspace'],
    });

    // Filter to ensure workspace belongs to org (defense in depth)
    const workspaceIds = memberWorkspaces
      .filter((m) => m.workspace?.organizationId === orgId) // Only workspaces in user's org
      .map((m) => m.workspace?.id)
      .filter((id): id is string => !!id);

    return workspaceIds.length > 0 ? workspaceIds : [];
  }

  /**
   * Check if user can access a specific workspace
   *
   * @param workspaceId - Workspace to check
   * @param organizationId - User's organization
   * @param userId - User ID (optional, required when flag is on and user is not ADMIN)
   * @param platformRole - User's platform role (ADMIN, MEMBER, VIEWER) - can be string for backward compatibility
   * @returns true if user can access, false otherwise
   */
  async canAccessWorkspace(
    workspaceId: string,
    organizationId: string,
    userId?: string,
    platformRole?: string | PlatformRole,
  ): Promise<boolean> {
    const accessibleIds = await this.getAccessibleWorkspaceIds(
      organizationId,
      userId,
      platformRole,
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
   * @param platformRole - User's platform role (ADMIN, MEMBER, VIEWER) - can be string for backward compatibility
   * @returns WorkspaceRole or null if no membership
   */
  async getUserWorkspaceRole(
    organizationId: string,
    workspaceId: string,
    userId: string,
    platformRole?: string | PlatformRole,
  ): Promise<WorkspaceRole | null> {
    const featureEnabled =
      this.configService.get<string>('ZEPHIX_WS_MEMBERSHIP_V1') === '1';

    // Normalize platform role
    const normalizedRole = normalizePlatformRole(platformRole);

    // If feature flag is OFF, treat everyone with workspace access as workspace_member
    // (except ADMIN which is treated as workspace_owner)
    if (!featureEnabled) {
      // Check if workspace exists and belongs to org
      const canAccess = await this.canAccessWorkspace(
        workspaceId,
        organizationId,
        userId,
        platformRole,
      );
      if (!canAccess) {
        return null;
      }
      // Platform ADMIN is treated as workspace_owner when flag is off
      if (normalizedRole === PlatformRole.ADMIN) {
        return 'workspace_owner';
      }
      // Everyone else is treated as workspace_member
      return 'workspace_member';
    }

    // Feature flag ON - use effective role helper
    return this.getEffectiveWorkspaceRole({
      userId,
      orgId: organizationId,
      platformRole: normalizedRole,
      workspaceId,
    });
  }

  /**
   * Get effective workspace role for a user
   * Centralized helper that derives effective role from platform role and workspace membership
   *
   * Rules:
   * - Platform ADMIN → always workspace_owner (implicit workspace_owner for all workspaces in org)
   * - Platform MEMBER or VIEWER → lookup WorkspaceMember and return membership role
   * - Returns null if no membership and not platform ADMIN
   *
   * @param params - Parameters object
   * @param params.userId - User ID
   * @param params.orgId - Organization ID
   * @param params.platformRole - User's platform role (ADMIN, MEMBER, VIEWER) - can be string for backward compatibility
   * @param params.workspaceId - Workspace ID
   * @returns Effective workspace role or null if no access
   */
  async getEffectiveWorkspaceRole(params: {
    userId: string;
    orgId: string;
    platformRole: PlatformRole | string; // Accept string for backward compatibility during migration
    workspaceId: string;
  }): Promise<WorkspaceRole | null> {
    const { userId, orgId, platformRole, workspaceId } = params;

    // Normalize platform role to handle both new enum and legacy string values
    const normalizedRole = normalizePlatformRole(platformRole);

    // Platform ADMIN always has workspace_owner effective role for all workspaces in the organization
    if (normalizedRole === PlatformRole.ADMIN) {
      return 'workspace_owner';
    }

    // For MEMBER and VIEWER, check workspace membership
    const member = await this.memberRepo.findOne({
      where: {
        workspaceId,
        userId,
      },
      relations: ['workspace'],
    });

    // Verify workspace belongs to user's org
    if (!member || member.workspace?.organizationId !== orgId) {
      return null;
    }

    // Return the membership role directly (already in workspace_owner, workspace_member, workspace_viewer format)
    return member.role;
  }

  /**
   * Check if actual role satisfies required role
   * Role hierarchy: workspace_owner > workspace_member > workspace_viewer
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
      workspace_owner: 3,
      workspace_member: 2,
      workspace_viewer: 1,
    };

    const actualLevel = roleHierarchy[actualRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return actualLevel >= requiredLevel;
  }
}
