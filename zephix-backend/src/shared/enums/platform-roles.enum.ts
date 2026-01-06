/**
 * PHASE 5.1: LOCKED PRODUCT MODEL - Platform Roles
 *
 * Only three platform roles exist. These are the ONLY roles exposed at the platform level.
 *
 * ADMIN (Paid):
 * - Creates organizations
 * - Creates workspaces
 * - Assigns initial workspace owner (must be a Member)
 * - Does NOT participate in daily work by default
 * - Has implicit workspace_owner access to all workspaces in organization
 *
 * MEMBER (Paid):
 * - Can be assigned as workspace owner or workspace member
 * - Participates in work (creates projects, tasks, etc.)
 * - Can be workspace owner and manage workspace members
 *
 * GUEST (Free):
 * - View only access
 * - Limited surfaces only
 * - ALWAYS maps to workspace_viewer when added to workspace (enforced)
 * - Cannot be workspace owner or workspace member
 *
 * IMPORTANT:
 * - Org role complexity (owner/admin/pm/member/viewer) is kept internal for backward compatibility
 * - UI should NEVER expose org role naming - only use Admin/Member/Guest
 * - Legacy role mapping exists for migration but new code should use PlatformRole enum
 */
export enum PlatformRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER', // VIEWER represents Guest users (free, view only)
}

/**
 * Legacy role mapping for backward compatibility during migration
 * Maps old role values to new PlatformRole enum
 *
 * NOTE: This mapping is for INTERNAL use only. UI should never expose these legacy values.
 * All new code should use PlatformRole enum directly.
 */
export const LEGACY_ROLE_MAPPING: Record<string, PlatformRole> = {
  // Old values -> New values
  owner: PlatformRole.ADMIN,
  admin: PlatformRole.ADMIN,
  pm: PlatformRole.MEMBER,
  project_manager: PlatformRole.MEMBER,
  member: PlatformRole.MEMBER,
  guest: PlatformRole.VIEWER, // Guest maps to VIEWER (free, view only)
  viewer: PlatformRole.VIEWER,
};

/**
 * Normalize a role string to PlatformRole enum
 * Handles both new and legacy role values
 */
export function normalizePlatformRole(
  role: string | null | undefined,
): PlatformRole {
  if (!role) return PlatformRole.VIEWER;

  const upperRole = role.toUpperCase();
  if (
    upperRole === PlatformRole.ADMIN ||
    upperRole === PlatformRole.MEMBER ||
    upperRole === PlatformRole.VIEWER
  ) {
    return upperRole as PlatformRole;
  }

  // Fallback to legacy mapping
  return LEGACY_ROLE_MAPPING[role.toLowerCase()] || PlatformRole.VIEWER;
}

/**
 * Check if a role has admin privileges
 */
export function isAdminRole(
  role: string | PlatformRole | null | undefined,
): boolean {
  const normalized =
    typeof role === 'string' ? normalizePlatformRole(role) : role;
  return normalized === PlatformRole.ADMIN;
}

/**
 * Check if a role can create workspaces
 */
export function canCreateWorkspaces(
  role: string | PlatformRole | null | undefined,
): boolean {
  return isAdminRole(role);
}

