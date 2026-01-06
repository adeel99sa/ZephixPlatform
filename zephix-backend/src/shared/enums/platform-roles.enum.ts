/**
 * Platform-level roles for Zephix Enterprise
 * These roles apply at the organization level and determine what users can do across the platform.
 *
 * ADMIN: Full organization level authority. Can create workspaces, manage all content, access admin dashboards.
 * MEMBER: Normal user. Can access workspaces where they are members, create/update projects and work items.
 * VIEWER: Read-only user. Can only view content where they have workspace_viewer access.
 */
export enum PlatformRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Legacy role mapping for backward compatibility during migration
 * Maps old role values to new PlatformRole enum
 */
export const LEGACY_ROLE_MAPPING: Record<string, PlatformRole> = {
  // Old values -> New values
  owner: PlatformRole.ADMIN,
  admin: PlatformRole.ADMIN,
  pm: PlatformRole.MEMBER,
  project_manager: PlatformRole.MEMBER,
  member: PlatformRole.MEMBER,
  guest: PlatformRole.VIEWER,
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

