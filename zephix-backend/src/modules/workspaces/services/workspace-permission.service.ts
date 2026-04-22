import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { WorkspaceRole } from '../entities/workspace.entity';
import {
  PlatformRole,
  normalizePlatformRole,
  isAdminRole,
} from '../../../shared/enums/platform-roles.enum';
import {
  OrgPolicyService,
} from '../../../organizations/services/org-policy.service';

/**
 * Phase 3: Workspace Permission Service
 * Resolves workspace permissions based on org roles, workspace roles, and permissions config
 */
export type WorkspacePermissionAction =
  | 'view_workspace'
  | 'edit_workspace_settings'
  | 'manage_workspace_members'
  | 'change_workspace_owner'
  | 'archive_workspace'
  | 'delete_workspace'
  | 'create_project_in_workspace'
  | 'create_board_in_workspace'
  | 'create_document_in_workspace';

export interface UserContext {
  id: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

@Injectable()
export class WorkspacePermissionService {
  private readonly logger = new Logger(WorkspacePermissionService.name);

  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly orgPolicyService: OrgPolicyService,
  ) {}

  /**
   * Get the effective workspace role for a user
   * Org owner and org admin are always treated as workspace_owner
   */
  async getRoleForUserInWorkspace(
    userId: string,
    orgRole: 'owner' | 'admin' | 'member' | 'viewer',
    workspaceId: string,
  ): Promise<WorkspaceRole | null> {
    // Platform ADMIN always has workspace_owner power
    const normalizedRole = normalizePlatformRole(orgRole);
    if (normalizedRole === PlatformRole.ADMIN) {
      return 'workspace_owner';
    }

    // For org members and viewers, check their workspace membership
    const membership = await this.workspaceMemberRepository.findOne({
      where: {
        userId,
        workspaceId,
      },
    });

    return membership?.role || null;
  }

  /**
   * Check if a user is allowed to perform an action in a workspace
   */
  async isAllowed(
    user: UserContext,
    workspaceId: string,
    action: WorkspacePermissionAction,
  ): Promise<boolean> {
    try {
      // Load workspace with permissions config
      const workspace = await this.workspaceRepository.findOne({
        where: { id: workspaceId, organizationId: user.organizationId },
        select: ['id', 'organizationId', 'permissionsConfig'],
      });

      if (!workspace) {
        this.logger.warn(
          `Workspace ${workspaceId} not found or not in org ${user.organizationId}`,
        );
        return false;
      }

      // Org platform ADMIN only — matches workspace creation policy (POST /workspaces).
      // Archive uses the same soft-delete path as DELETE; workspace_owner cannot remove the container.
      if (action === 'delete_workspace' || action === 'archive_workspace') {
        return isAdminRole(user.role);
      }

      // Platform ADMIN always allowed for remaining actions
      if (isAdminRole(user.role)) {
        return true;
      }

      /*
       * P-1 + MVP-5A: Org-level policy enforcement via workspace permission defaults.
       *
       * Org policy is the CEILING — if the org says "wsOwnersCanInviteMembers: false",
       * no workspace config can override that. The check happens BEFORE the workspace
       * matrix so the cascade is: org policy → workspace config → role default.
       *
       * Platform ADMIN is already returned above (never blocked by org policies).
       */
      const ACTION_TO_ORG_POLICY: Partial<Record<WorkspacePermissionAction, string>> = {
        manage_workspace_members: 'wsOwnersCanInviteMembers',
        edit_workspace_settings: 'wsOwnersCanManagePermissions',
        create_project_in_workspace: 'wsOwnersCanCreateProjects',
      };
      const orgPolicyKey = ACTION_TO_ORG_POLICY[action];
      if (orgPolicyKey) {
        const orgMatrix = await this.orgPolicyService.getPermissionMatrix(user.organizationId);
        const wsDefaults = await this.orgPolicyService.getWorkspacePermissionDefaults(user.organizationId);
        if (!this.orgPolicyService.isMatrixPolicyAllowed(orgPolicyKey, user.role, orgMatrix, wsDefaults)) {
          return false; // Org policy blocks this action
        }
      }

      // Get user's workspace role
      const workspaceRole = await this.getRoleForUserInWorkspace(
        user.id,
        user.role,
        workspaceId,
      );

      if (!workspaceRole) {
        // User is not a member of the workspace
        return false;
      }

      // Workspace owner always allowed
      if (workspaceRole === 'workspace_owner') {
        return true;
      }

      // Check permissions config matrix
      const permissionsConfig =
        workspace.permissionsConfig || this.getDefaultPermissionsConfig();

      const allowedRoles = permissionsConfig[action] || [];

      return allowedRoles.includes(workspaceRole);
    } catch (error) {
      this.logger.error(
        `Error checking permission for user ${user.id} in workspace ${workspaceId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Get default permissions config if workspace doesn't have one
   */
  private getDefaultPermissionsConfig(): Record<string, string[]> {
    return {
      view_workspace: [
        'workspace_owner',
        'workspace_member',
        'workspace_viewer',
      ],
      edit_workspace_settings: ['workspace_owner'],
      manage_workspace_members: ['workspace_owner'],
      change_workspace_owner: ['workspace_owner'],
      // delete/archive are enforced in isAllowed() — org platform ADMIN only (not matrix-driven)
      archive_workspace: ['workspace_owner'],
      delete_workspace: ['workspace_owner'],
      create_project_in_workspace: ['workspace_owner'],
      create_board_in_workspace: ['workspace_owner'],
      create_document_in_workspace: ['workspace_owner', 'workspace_member'],
    };
  }

  /**
   * Validate permissions config structure
   */
  validatePermissionsConfig(config: Record<string, string[]>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const validRoles = [
      'workspace_owner',
      'workspace_member',
      'workspace_viewer',
    ];
    const validActions: WorkspacePermissionAction[] = [
      'view_workspace',
      'edit_workspace_settings',
      'manage_workspace_members',
      'change_workspace_owner',
      'archive_workspace',
      'delete_workspace',
      'create_project_in_workspace',
      'create_board_in_workspace',
      'create_document_in_workspace',
    ];

    for (const [action, roles] of Object.entries(config)) {
      if (!validActions.includes(action as WorkspacePermissionAction)) {
        errors.push(`Invalid action: ${action}`);
      }

      if (!Array.isArray(roles)) {
        errors.push(`Action ${action} must have an array of roles`);
        continue;
      }

      for (const role of roles) {
        if (!validRoles.includes(role)) {
          errors.push(`Invalid role ${role} for action ${action}`);
        }
      }

      // Workspace owner must always be included for all actions
      if (!roles.includes('workspace_owner')) {
        errors.push(`Action ${action} must include 'workspace_owner' role`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
