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
    'pm': 'MEMBER',
    'project_manager': 'MEMBER',
    'member': 'MEMBER',
    'guest': 'VIEWER',
    'viewer': 'VIEWER',
  };

  return legacyMapping[role.toLowerCase()] || 'VIEWER';
}

/**
 * Check if a role has admin privileges
 */
export function isAdminRole(role: string | undefined | null): boolean {
  return normalizePlatformRole(role) === 'ADMIN';
}

/**
 * Check if a user object represents an admin user
 * Single source of truth for admin detection in frontend
 *
 * Contract: Frontend treats user as admin ONLY if user.permissions.isAdmin === true
 * This field comes from backend /api/auth/me and /api/auth/login responses
 *
 * No fallbacks - if permissions.isAdmin is missing or false, user is not admin
 */
export function isAdminUser(user: {
  role?: string | null;
  platformRole?: string | null;
  email?: string | null;
  permissions?: { isAdmin?: boolean } | string[] | null;
} | null | undefined): boolean {
  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[isAdminUser] decision: false - user is null/undefined');
    }
    return false;
  }

  // Check if user has admin role via platformRole
  if (user.platformRole?.toLowerCase() === 'admin') {
    return true;
  }

  // Check permissions object format (from certain contexts)
  if (user.permissions && !Array.isArray(user.permissions)) {
    const isAdmin = user.permissions.isAdmin === true;
    // Always log this critical check
    console.log('[isAdminUser] ⚠️ CRITICAL CHECK:', {
      userEmail: user.email,
      permissionsObject: user.permissions,
      permissionsIsAdmin: user.permissions?.isAdmin,
      isAdminType: typeof user.permissions?.isAdmin,
      strictEqualityCheck: user.permissions?.isAdmin === true,
      decision: isAdmin ? 'TRUE ✅' : 'FALSE ❌',
    });
    return isAdmin;
  }

  // Fallback to legacy role check
  return user.role?.toLowerCase() === 'admin';
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
 * Check if a role can manage workspaces
 * Only platform ADMIN can create workspaces
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
