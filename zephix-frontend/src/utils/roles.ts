/**
 * ROLE MAPPING SUMMARY:
 * - Frontend receives: role = 'ADMIN' | 'MEMBER' | 'VIEWER' (from backend)
 * - Frontend receives: permissions.isAdmin = boolean (from backend)
 * - Frontend admin check: isAdminUser() checks permissions.isAdmin first, then role
 * - normalizePlatformRole() maps: 'admin'/'owner' → 'ADMIN', 'pm'/'member' → 'MEMBER', 'viewer' → 'VIEWER'
 */
/**
 * Unified role type definition for Zephix platform
 * Platform roles: ADMIN, MEMBER, VIEWER
 * These match the backend PlatformRole enum
 */
export type PlatformRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

/**
 * Platform role constants to avoid string literal comparisons
 */
export const PLATFORM_ROLE = {
  ADMIN: 'ADMIN' as PlatformRole,
  MEMBER: 'MEMBER' as PlatformRole,
  VIEWER: 'VIEWER' as PlatformRole,
} as const;

/**
 * Legacy organization directory API role literals (`/admin/users` admin UI).
 * Distinct from canonical PLATFORM_ROLE until the directory API aligns with platform enums.
 */
export const LEGACY_ORG_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

/**
 * Legacy role type for backward compatibility during migration
 * Maps old role values to new PlatformRole
 */
export type UserRole = PlatformRole | 'owner' | 'admin' | 'member' | 'viewer' | 'pm' | 'guest' | 'project_manager';

/**
 * Normalize a role string to PlatformRole
 * Handles both new and legacy role values
 */
export function normalizePlatformRole(role: string | undefined | null): PlatformRole {
  if (!role) return 'VIEWER';

  const upperRole = role.toUpperCase();
  if (upperRole === 'ADMIN' || upperRole === 'MEMBER' || upperRole === 'VIEWER') {
    return upperRole as PlatformRole;
  }

  // Legacy role mapping
  const legacyMapping: Record<string, PlatformRole> = {
    'owner': 'ADMIN',
    'admin': 'ADMIN',
    'manager': 'MEMBER',
    'pm': 'MEMBER',
    'project_manager': 'MEMBER',
    'member': 'MEMBER',
    'guest': 'VIEWER',
    'viewer': 'VIEWER',
  };

  return legacyMapping[role.toLowerCase()] || 'VIEWER';
}

/**
 * Resolve the canonical PlatformRole for a user object.
 * Prefers platformRole, falls back to role, then authStoreRole.
 * Always returns a normalized PlatformRole — never an unsafe cast.
 */
export function platformRoleFromUser(
  user: { platformRole?: string | null; role?: string | null } | null | undefined,
  authStoreRole?: string | null,
): PlatformRole {
  const raw = user?.platformRole ?? user?.role ?? authStoreRole;
  return normalizePlatformRole(raw);
}

/**
 * Check if a role has admin privileges
 */
export function isAdminRole(role: string | undefined | null): boolean {
  return normalizePlatformRole(role) === 'ADMIN';
}

/**
 * @deprecated Use `isPlatformAdmin` from `@/utils/access` for platform-level admin checks.
 *
 * Backward-compat shim for legacy callsites. Kept temporarily while consumers migrate.
 */
export function isAdminUser(user: {
  role?: string | null;
  platformRole?: string | null;
  permissions?: { isAdmin?: boolean } | string[] | null;
} | null | undefined): boolean {
  if (!user) return false;
  const normalized = normalizePlatformRole(user.platformRole ?? user.role);
  if (normalized === PLATFORM_ROLE.ADMIN) return true;
  if (!Array.isArray(user.permissions)) return user.permissions?.isAdmin === true;
  return false;
}

/**
 * Check if a user has paid access (Admin or Member)
 * Guest (Viewer) does not have paid access
 * Uses normalized platformRole values only
 */
export function isPaidUser(user: {
  role?: string | null;
  platformRole?: string | null;
  permissions?: { isAdmin?: boolean } | string[] | null;
} | null | undefined): boolean {
  if (!user) return false;

  // Always prefer platformRole over role when both exist
  const roleToCheck = user.platformRole || user.role;
  if (roleToCheck) {
    const role = normalizePlatformRole(roleToCheck);
    return role === PLATFORM_ROLE.ADMIN || role === PLATFORM_ROLE.MEMBER;
    // VIEWER is explicitly excluded
  }

  // Fallback to permissions.isAdmin (Admin is always paid)
  // Handle both object and array formats
  if (user.permissions && !Array.isArray(user.permissions) && user.permissions.isAdmin === true) {
    return true;
  }

  // Default to false (Guest/Viewer)
  return false;
}

/**
 * Whether a raw role string resolves to platform ADMIN (legacy helper).
 * Prefer `canCreateOrgWorkspace(user)` from `@/utils/access` for UI; it uses
 * platformRole and permissions consistently with the backend.
 */
export function canManageWorkspaces(role: string | undefined | null): boolean {
  return isAdminRole(role);
}

/**
 * Check if a role can create projects
 */
export function canCreateProjects(role: string | undefined | null, isWorkspaceOwner: boolean = false): boolean {
  const normalized = normalizePlatformRole(role);
  return normalized === 'ADMIN' || normalized === 'MEMBER' || isWorkspaceOwner;
}

/**
 * PHASE 7 MODULE 7.1: Check if user is Guest (VIEWER)
 * Guest users have read-only access and cannot write
 */
export function isGuestUser(user: {
  role?: string | null;
  platformRole?: string | null;
} | null | undefined): boolean {
  if (!user) return false;
  const roleToCheck = user.platformRole || user.role;
  if (!roleToCheck) return false;
  const normalized = normalizePlatformRole(roleToCheck);
  return normalized === PLATFORM_ROLE.VIEWER;
}
