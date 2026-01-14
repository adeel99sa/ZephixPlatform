import { SetMetadata } from '@nestjs/common';
import { WorkspacePermissionAction } from '../services/workspace-permission.service';

export const REQUIRE_WORKSPACE_PERMISSION_KEY = 'requireWorkspacePermission';

/**
 * Decorator to require a specific workspace permission
 * Usage: @RequireWorkspacePermission('edit_workspace_settings')
 */
export const RequireWorkspacePermission = (action: WorkspacePermissionAction) =>
  SetMetadata(REQUIRE_WORKSPACE_PERMISSION_KEY, action);
