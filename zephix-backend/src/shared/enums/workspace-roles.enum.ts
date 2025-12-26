/**
 * Workspace-level roles for Zephix Enterprise
 * These roles apply within a specific workspace and determine what users can do inside that workspace.
 *
 * workspace_owner: Full control over workspace, can manage members, settings, and all content.
 * workspace_member: Contributor. Can create projects and content, but cannot manage workspace settings or members.
 * workspace_viewer: Read-only access. Can view workspace content but cannot create, update, or delete.
 */
export type WorkspaceRole =
  | 'workspace_owner'
  | 'workspace_member'
  | 'workspace_viewer';

/**
 * Workspace role hierarchy for permission checks
 */
export const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  workspace_owner: 3,
  workspace_member: 2,
  workspace_viewer: 1,
};

/**
 * Check if actual workspace role satisfies required role
 */
export function hasWorkspaceRoleAtLeast(
  requiredRole: WorkspaceRole,
  actualRole: WorkspaceRole | null,
): boolean {
  if (!actualRole) return false;
  return (
    WORKSPACE_ROLE_HIERARCHY[actualRole] >=
    WORKSPACE_ROLE_HIERARCHY[requiredRole]
  );
}
