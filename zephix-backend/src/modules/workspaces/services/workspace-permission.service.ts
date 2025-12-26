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

      // Platform ADMIN always allowed for all actions
      if (isAdminRole(user.role)) {
        return true;
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
      archive_workspace: ['workspace_owner'],
      delete_workspace: ['workspace_owner'],
      create_project_in_workspace: ['workspace_owner', 'workspace_member'],
      create_board_in_workspace: ['workspace_owner', 'workspace_member'],
      create_document_in_workspace: [
        'workspace_owner',
        'workspace_member',
        'workspace_viewer',
      ],
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
