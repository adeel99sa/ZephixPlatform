/**
 * Module-scope snapshot of AuthContext org id for non-React consumers (e.g. Stack 1 axios interceptors).
 * AuthProvider keeps this in sync via setAuthOrganizationId — do not import AuthContext from lib/api.ts.
 */
let authOrganizationId: string | null = null;

export function setAuthOrganizationId(id: string | null | undefined): void {
  authOrganizationId = id && String(id).length > 0 ? String(id) : null;
}

export function getAuthOrganizationId(): string | null {
  return authOrganizationId;
}
