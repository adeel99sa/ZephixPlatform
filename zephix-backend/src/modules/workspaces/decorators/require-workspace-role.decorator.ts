import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '../entities/workspace.entity';

export interface RequireWorkspaceRoleOptions {
  allowAdminOverride?: boolean;
}

export const REQUIRE_WORKSPACE_ROLE_KEY = 'requireWorkspaceRole';

/**
 * Decorator to require a minimum workspace role
 * @param requiredRole - Minimum required role ('owner', 'member', 'viewer')
 * @param options - Options including allowAdminOverride (default: true)
 */
export const RequireWorkspaceRole = (
  requiredRole: WorkspaceRole,
  options: RequireWorkspaceRoleOptions = { allowAdminOverride: true },
) => SetMetadata(REQUIRE_WORKSPACE_ROLE_KEY, { requiredRole, ...options });
