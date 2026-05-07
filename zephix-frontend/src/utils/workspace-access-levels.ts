/**
 * PROMPT 5: Workspace Access Level Mapping
 *
 * Maps internal workspace roles to UI access levels.
 * This is the single source of truth for access level display in the UI.
 *
 * PROMPT 5 Part D Mapping Rules:
 * - workspace_owner or delivery_owner → Owner
 * - workspace_member → Member
 * - stakeholder or workspace_viewer → Guest
 *
 * Note: Guest platform role always maps to Guest workspace access.
 */
import { isWorkspaceMember, isWorkspaceOwner, isWorkspaceViewer } from '@/utils/access';
import { normalizePlatformRole, PLATFORM_ROLE } from '@/utils/roles';
import type { WorkspaceRole } from '@/state/workspace.store';

export type WorkspaceAccessLevel = 'Owner' | 'Member' | 'Guest';

/** Workspace role strings returned by `/workspaces/:id/role` hook (legacy uppercase). */
export const WORKSPACE_HOOK_ROLE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
} as const;

function isDeliveryOrHookOwner(role: string): boolean {
  return role === 'delivery_owner' || role === WORKSPACE_HOOK_ROLE.OWNER;
}

/**
 * PROMPT 5 Part D: Map internal workspace role to UI access level
 *
 * Mapping:
 * - workspace_owner or delivery_owner or OWNER → Owner
 * - workspace_member or ADMIN or MEMBER → Member
 * - stakeholder or workspace_viewer or GUEST → Guest
 *
 * Supports both snake_case workspace roles and UPPERCASE hook roles
 */
export function mapRoleToAccessLevel(
  role:
    | WorkspaceRole
    | (typeof WORKSPACE_HOOK_ROLE)[keyof typeof WORKSPACE_HOOK_ROLE]
    | null
    | undefined,
): WorkspaceAccessLevel {
  if (!role) return 'Guest';

  if (isWorkspaceOwner(role) || isDeliveryOrHookOwner(role)) {
    return 'Owner';
  }
  if (isWorkspaceMember(role) || role === WORKSPACE_HOOK_ROLE.ADMIN || role === WORKSPACE_HOOK_ROLE.MEMBER) {
    return 'Member';
  }
  if (
    isWorkspaceViewer(role) ||
    role === 'stakeholder' ||
    role === WORKSPACE_HOOK_ROLE.GUEST
  ) {
    return 'Guest';
  }
  return 'Guest';
}

/**
 * PROMPT 5 Part D: Map UI access level to internal workspace role
 *
 * Note: This is used when inviting/changing roles. We map:
 * - Owner → workspace_owner
 * - Member → workspace_member
 * - Guest → workspace_viewer
 */
export function mapAccessLevelToRole(accessLevel: WorkspaceAccessLevel): WorkspaceRole {
  switch (accessLevel) {
    case 'Owner':
      return 'workspace_owner';
    case 'Member':
      return 'workspace_member';
    case 'Guest':
      return 'workspace_viewer';
  }
}

/**
 * Get platform role display name
 */
export function getPlatformRoleDisplay(role: string | null | undefined): 'Admin' | 'Member' | 'Guest' {
  const normalized = normalizePlatformRole(role);
  if (normalized === PLATFORM_ROLE.ADMIN) return 'Admin';
  if (normalized === PLATFORM_ROLE.MEMBER) return 'Member';
  return 'Guest';
}
