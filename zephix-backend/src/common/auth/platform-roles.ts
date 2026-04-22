/**
 * Canonical Platform Role module for Zephix RBAC system.
 *
 * This is the single source of truth for platform-level role definitions
 * and normalization. All guards and services should import from this module.
 * `shared/enums/platform-roles.enum.ts` is a re-export shim pointing here.
 *
 * Three platform roles:
 *   ADMIN  — org-wide admin; sole platform role that may create org workspaces (paid)
 *   MEMBER — participates in work inside assigned workspaces (paid)
 *   VIEWER — read-only guest access (free)
 *
 * Role resolution precedence in guards:
 *   user.platformRole ?? user.role
 *   platformRole is set from UserOrganization.role at login time.
 *   role is the base User.role field (legacy, always 'ADMIN' for registered users).
 */

export enum PlatformRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Legacy role values that map to canonical PlatformRole.
 * Kept here for documentation; normalizePlatformRole handles them inline.
 */
export const LEGACY_ROLE_MAPPING: Record<string, PlatformRole> = {
  owner: PlatformRole.ADMIN,
  admin: PlatformRole.ADMIN,
  administrator: PlatformRole.ADMIN,
  pm: PlatformRole.MEMBER,
  project_manager: PlatformRole.MEMBER,
  manager: PlatformRole.MEMBER,
  member: PlatformRole.MEMBER,
  guest: PlatformRole.VIEWER,
  viewer: PlatformRole.VIEWER,
};

/**
 * Normalize a raw role string to a canonical PlatformRole.
 *
 * Defaults to VIEWER for unknown or empty input — safe for write-block guards
 * (unknown roles are treated as least-privileged, not as errors).
 */
export function normalizePlatformRole(
  role?: string | null,
): PlatformRole {
  if (!role) return PlatformRole.VIEWER;

  const r = role.toLowerCase();
  const mapped = LEGACY_ROLE_MAPPING[r];
  if (mapped) return mapped;

  // Exact uppercase match for already-normalized values
  if (role === 'ADMIN') return PlatformRole.ADMIN;
  if (role === 'MEMBER') return PlatformRole.MEMBER;
  if (role === 'VIEWER') return PlatformRole.VIEWER;

  return PlatformRole.VIEWER;
}

/**
 * Resolve the effective platform role from a JWT user object.
 *
 * Precedence: user.platformRole ?? user.role
 * platformRole carries the org-context role set at login (from UserOrganization).
 * user.role is the base DB field and should only be used as a fallback.
 */
export function resolvePlatformRoleFromRequestUser(
  user: { platformRole?: string | null; role?: string | null } | null | undefined,
): PlatformRole {
  return normalizePlatformRole(user?.platformRole ?? user?.role);
}

/** Return true when the given role has ADMIN privileges. */
export function isAdminPlatformRole(role: PlatformRole | string | null | undefined): boolean {
  const normalized =
    typeof role === 'string' ? normalizePlatformRole(role) : role;
  return normalized === PlatformRole.ADMIN;
}

/** Return true when the given role is MEMBER. */
export function isMemberPlatformRole(role: PlatformRole | string | null | undefined): boolean {
  const normalized =
    typeof role === 'string' ? normalizePlatformRole(role) : role;
  return normalized === PlatformRole.MEMBER;
}

/** Return true when the given role is VIEWER (guest). */
export function isViewerPlatformRole(role: PlatformRole | string | null | undefined): boolean {
  const normalized =
    typeof role === 'string' ? normalizePlatformRole(role) : role;
  return normalized === PlatformRole.VIEWER;
}

/**
 * Alias for isAdminPlatformRole — kept for backward compatibility with callers
 * that import `isAdminRole` from this module.
 */
export const isAdminRole = isAdminPlatformRole;

/**
 * Return true when the given role is allowed to create workspaces (ADMIN only).
 * Exported for backward compatibility with callers importing from this module
 * or from the shared/enums shim.
 */
export function canCreateWorkspaces(
  role: string | PlatformRole | null | undefined,
): boolean {
  return isAdminPlatformRole(role as string);
}
