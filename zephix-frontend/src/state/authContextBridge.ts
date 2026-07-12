/**
 * Module-scope snapshot of AuthContext for non-React consumers (e.g. Stack 1 axios interceptors,
 * governance toast actions). AuthProvider keeps this in sync — do not import AuthContext from lib/api.ts.
 */
let authOrganizationId: string | null = null;
let authPlatformRole: string | null = null;

export function setAuthOrganizationId(id: string | null | undefined): void {
  authOrganizationId = id && String(id).length > 0 ? String(id) : null;
}

export function getAuthOrganizationId(): string | null {
  return authOrganizationId;
}

/** Sync platform role for non-React callers (MP-3 governance exception CTA). */
export function setAuthPlatformRole(role: string | null | undefined): void {
  authPlatformRole = role && String(role).length > 0 ? String(role) : null;
}

export function getAuthPlatformRole(): string | null {
  return authPlatformRole;
}
