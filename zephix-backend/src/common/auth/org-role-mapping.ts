export type OrgApiRole = 'admin' | 'member' | 'viewer';
export type OrgLegacyRole = 'owner' | 'admin' | 'pm' | 'viewer';

/**
 * Map external org API role -> legacy persisted role.
 * DB still stores "pm" for member-level org access.
 */
export function toLegacyOrgRole(role: OrgApiRole): Exclude<OrgLegacyRole, 'owner'> {
  if (role === 'member') return 'pm';
  return role;
}

/**
 * Map legacy persisted org role -> external org API role.
 * Owner is treated as admin for API surface.
 */
export function toApiOrgRole(role: OrgLegacyRole | string | null | undefined): OrgApiRole {
  if (!role) return 'viewer';
  if (role === 'owner' || role === 'admin') return 'admin';
  if (role === 'pm' || role === 'member') return 'member';
  return 'viewer';
}

