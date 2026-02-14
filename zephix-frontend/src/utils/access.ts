/**
 * Phase 2A: Single source of truth for role-based access decisions.
 *
 * Platform roles: ADMIN, MEMBER, VIEWER (Guest)
 * Workspace roles: workspace_owner, workspace_member, workspace_viewer
 *
 * Rules:
 *   - Guest is always read-only
 *   - Member can edit tasks and project structure inside permitted workspaces
 *   - Workspace owner can invite and manage workspace settings
 *   - Platform admin can access organization-wide admin and sees all workspaces
 */

import { normalizePlatformRole, type PlatformRole, PLATFORM_ROLE } from './roles';

export type WorkspaceRole =
  | 'workspace_owner'
  | 'workspace_member'
  | 'workspace_viewer'
  | 'delivery_owner'
  | 'stakeholder';

type UserLike = {
  role?: string | null;
  platformRole?: string | null;
  permissions?: { isAdmin?: boolean } | string[] | null;
} | null | undefined;

// ── Platform role checks ──────────────────────────────────────────────

export function isPlatformAdmin(user: UserLike): boolean {
  if (!user) return false;
  const role = normalizePlatformRole(user.platformRole || user.role);
  if (role === PLATFORM_ROLE.ADMIN) return true;
  if (user.permissions && !Array.isArray(user.permissions)) {
    return user.permissions.isAdmin === true;
  }
  return false;
}

export function isPlatformViewer(user: UserLike): boolean {
  if (!user) return false;
  const role = normalizePlatformRole(user.platformRole || user.role);
  return role === PLATFORM_ROLE.VIEWER;
}

export function isPlatformMember(user: UserLike): boolean {
  if (!user) return false;
  const role = normalizePlatformRole(user.platformRole || user.role);
  return role === PLATFORM_ROLE.MEMBER;
}

// ── Workspace role checks ─────────────────────────────────────────────

export function isWorkspaceOwner(role: string | null | undefined): boolean {
  return role === 'workspace_owner';
}

export function isWorkspaceMember(role: string | null | undefined): boolean {
  return role === 'workspace_member';
}

export function isWorkspaceViewer(role: string | null | undefined): boolean {
  return role === 'workspace_viewer';
}

// ── Composite permission checks ───────────────────────────────────────

/** Financial data (cost summaries, budget) — blocked for guests */
export function canSeeCost(
  workspaceRole: string | null | undefined,
  platformRole: string | null | undefined,
): boolean {
  const normalized = normalizePlatformRole(platformRole);
  return normalized !== PLATFORM_ROLE.VIEWER;
}

/** Workspace admin (settings, invite) — workspace_owner or platform admin */
export function canSeeWorkspaceAdmin(
  workspaceRole: string | null | undefined,
  platformRole: string | null | undefined,
): boolean {
  if (isPlatformAdmin({ platformRole })) return true;
  return workspaceRole === 'workspace_owner' || workspaceRole === 'delivery_owner';
}

/** Organization-wide admin — platform admin only */
export function canSeeOrgAdmin(platformRole: string | null | undefined): boolean {
  return normalizePlatformRole(platformRole) === PLATFORM_ROLE.ADMIN;
}

/** Template management — admin or workspace owner */
export function canManageTemplates(
  platformRole: string | null | undefined,
  workspaceRole: string | null | undefined,
): boolean {
  if (isPlatformAdmin({ platformRole })) return true;
  return workspaceRole === 'workspace_owner';
}

/** Invite members to workspace — workspace owner or platform admin */
export function canInviteToWorkspace(
  workspaceRole: string | null | undefined,
  platformRole: string | null | undefined,
): boolean {
  if (isPlatformAdmin({ platformRole })) return true;
  return workspaceRole === 'workspace_owner';
}

/** Edit project content — not a guest */
export function canEditProject(
  workspaceRole: string | null | undefined,
  platformRole: string | null | undefined,
): boolean {
  const normalized = normalizePlatformRole(platformRole);
  return normalized !== PLATFORM_ROLE.VIEWER;
}
