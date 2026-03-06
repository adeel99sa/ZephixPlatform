/**
 * Canonical Platform Role module for Zephix RBAC system.
 *
 * This is the single source of truth for platform-level role definitions
 * and normalization. All guards should import from this module.
 *
 * Three platform roles:
 *   ADMIN  — org-wide admin, creates workspaces, manages org (paid)
 *   MEMBER — participates in work, can own workspaces (paid)
 *   VIEWER — read-only guest access (free)
 *
 * Role resolution precedence in guards:
 *   user.platformRole ?? user.role
 *   platformRole is set from UserOrganization.role at login time.
 *   role is the base User.role field (legacy, always 'admin' for registered users).
 */

export enum PlatformRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Normalize a raw role string to a canonical PlatformRole.
 *
 * Returns null for unknown or empty input rather than defaulting to VIEWER.
 * Guards should treat null as "no recognized role → deny".
 */
export function normalizePlatformRole(
  role?: string | null,
): PlatformRole | null {
  if (!role) return null;

  const r = role.toLowerCase();

  if (r === 'owner' || r === 'admin' || r === 'administrator') {
    return PlatformRole.ADMIN;
  }
  if (r === 'pm' || r === 'project_manager' || r === 'member') {
    return PlatformRole.MEMBER;
  }
  if (r === 'guest' || r === 'viewer') {
    return PlatformRole.VIEWER;
  }

  // Exact uppercase match for already-normalized values
  if (role === 'ADMIN') return PlatformRole.ADMIN;
  if (role === 'MEMBER') return PlatformRole.MEMBER;
  if (role === 'VIEWER') return PlatformRole.VIEWER;

  return null;
}

/**
 * Return true when the given role has ADMIN privileges.
 * Null / unknown roles return false.
 */
export function isAdminRole(role: PlatformRole | string | null | undefined): boolean {
  const normalized =
    typeof role === 'string' ? normalizePlatformRole(role) : role;
  return normalized === PlatformRole.ADMIN;
}
