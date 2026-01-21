/**
 * PROMPT 7 C1: Access Mapping Utility
 *
 * Single source of truth for mapping between:
 * - Workspace roles (internal) and access levels (UI)
 * - Platform roles and default workspace roles
 * - Access levels and workspace roles
 */
import { WorkspaceRole } from '@/state/workspace.store';
import { normalizePlatformRole } from '@/types/roles';
import type { PlatformRole } from '@/types/roles';

export type WorkspaceAccessLevel = 'Owner' | 'Member' | 'Guest';

/**
 * Map internal workspace role to UI access level
 */
export function fromWorkspaceRoleToAccessLevel(
  role: WorkspaceRole | null | undefined
): WorkspaceAccessLevel {
  if (!role) return 'Guest';

  switch (role) {
    case 'workspace_owner':
    case 'delivery_owner': // Map delivery_owner to Owner for UI display
      return 'Owner';
    case 'workspace_member':
      return 'Member';
    case 'workspace_viewer':
    case 'stakeholder': // Map stakeholder to Guest for UI display
      return 'Guest';
    default:
      return 'Guest';
  }
}

/**
 * Map UI access level to internal workspace role
 */
export function fromAccessLevelToWorkspaceRole(
  accessLevel: WorkspaceAccessLevel
): WorkspaceRole {
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
 * Map platform role to default workspace role
 *
 * Rules:
 * - Guest platform role always maps to workspace_viewer
 * - Member platform role maps to workspace_member
 * - Admin platform role maps to workspace_member (can be promoted to owner later)
 */
export function fromPlatformRoleToDefaultWorkspaceRole(
  platformRole: PlatformRole | string | null | undefined
): WorkspaceRole {
  const normalized = normalizePlatformRole(platformRole);

  switch (normalized) {
    case 'VIEWER':
      return 'workspace_viewer';
    case 'ADMIN':
      return 'workspace_member'; // Admin gets member by default, can be promoted
    case 'MEMBER':
      return 'workspace_member';
    default:
      return 'workspace_viewer';
  }
}
