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
import { WorkspaceRole } from '@/state/workspace.store';

export type WorkspaceAccessLevel = 'Owner' | 'Member' | 'Guest';

/**
 * PROMPT 5 Part D: Map internal workspace role to UI access level
 *
 * Mapping:
 * - workspace_owner or delivery_owner → Owner
 * - workspace_member → Member
 * - stakeholder or workspace_viewer → Guest
 */
export function mapRoleToAccessLevel(role: WorkspaceRole | null | undefined): WorkspaceAccessLevel {
  if (!role) return 'Guest';

  switch (role) {
    case 'workspace_owner':
    case 'delivery_owner':
      return 'Owner';
    case 'workspace_member':
      return 'Member';
    case 'workspace_viewer':
    case 'stakeholder':
      return 'Guest';
    default:
      return 'Guest';
  }
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
  if (!role) return 'Guest';
  const normalized = role.toLowerCase();
  if (normalized === 'admin' || normalized === 'owner') return 'Admin';
  if (normalized === 'member' || normalized === 'pm') return 'Member';
  return 'Guest';
}
