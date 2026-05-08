/**
 * Stream B — frontend RBAC / identity types (forward-compatible with Stream A `/auth/me`).
 */

export type OrgRoleUi = "admin" | "member" | "viewer";

export type WorkspaceRoleUi = "workspace_owner" | "workspace_member" | "workspace_viewer";

export type WorkspaceMembershipSummary = {
  workspaceId: string;
  workspaceName: string;
  accessLevel: string;
};

/** Optional enriched scopes object when backend ships Stream A contract. */
export type UserScopes = {
  organizationId: string | null;
  platformRole: string;
  workspaceMemberships: WorkspaceMembershipSummary[];
  mfaEnrolled?: boolean;
};

export type AuthUserLike = {
  id?: string;
  platformRole?: string | null;
  role?: string | null;
  permissions?: { isAdmin?: boolean } | string[] | null;
};
