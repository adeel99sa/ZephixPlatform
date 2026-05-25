/**
 * Org + active-workspace effective role hook for shell and feature gating.
 * Uses canonical helpers from @/utils/access and @/utils/roles (Rule A).
 *
 * Capability tokens MUST align with `docs/architecture/role-taxonomy-mvp.md` §4.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolution paths
 * ─────────────────────────────────────────────────────────────────────────────
 * Two distinct resolution paths live in `can()` below. Tokens are categorized
 * by which path they take:
 *
 * (1) PLATFORM-ROLE TOKENS — nav/visibility gates. Resolve from
 *     `isPlatformAdmin/Member/Viewer(user)` only. Workspace membership is
 *     irrelevant to whether the affordance renders.
 *     Tokens:
 *       admin.view, inbox.view, task.view, template.view, workspace.view,
 *       dashboard.view.published, project.view, document.view
 *
 * (2) WORKSPACE-AWARE TOKENS — action-authority gates. Resolve via
 *     `effectiveWorkspaceUiColumns(user, workspaceRole)` which implements the
 *     taxonomy §2.4 column collapse:
 *       Admin column = platform ADMIN OR workspace_owner
 *       Member column = workspace_member OR delivery_owner (per §5.5)
 *       Viewer column = platform VIEWER OR workspace_viewer OR stakeholder
 *                       (per §5.6)
 *     This matches the backend `getEffectiveWorkspaceRole` helper's collapse;
 *     denying these to a Platform MEMBER with no membership row OR with
 *     workspace_viewer membership mirrors what the server would do on the
 *     same request.
 *     Tokens (this PR adds task.*, artifact.create):
 *       project.edit, project.manage.team, project.archive, project.delete,
 *       document.create, document.edit, document.delete,
 *       artifact.create,
 *       task.create, task.edit, task.delete, task.assign, task.bulk.update
 *
 * Adding a new token: pick a path and document the choice via the §4 row
 * (frontend MUST not invent tokens; taxonomy is source of truth).
 *
 * @see docs/architecture/role-taxonomy-mvp.md
 * @see docs/architecture/role-taxonomy-mvp.md §2.4 (Admin / Member / Viewer columns)
 * @see docs/architecture/role-taxonomy-mvp.md §5.5 (delivery_owner = Member)
 * @see docs/architecture/role-taxonomy-mvp.md §5.6 (stakeholder = Viewer)
 * @see docs/adrs/ADR-001-workspace-is-the-container.md
 * @see zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md
 */
import { useCallback, useMemo } from "react";

import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import type { WorkspaceRole as StoreWorkspaceRole } from "@/state/workspace.store";
import { isPlatformAdmin, isPlatformMember, isPlatformViewer } from "@/utils/access";
import { platformRoleFromUser, PLATFORM_ROLE, type PlatformRole } from "@/utils/roles";

/** Lowercase platform role for UI comparisons (matches workstream contract). */
export type EffectivePlatformRoleLower = "admin" | "member" | "viewer";

/**
 * Tokens implemented in `can()` — must exist in role-taxonomy-mvp.md §4.
 */
export type EffectiveAction =
  | "admin.view"
  | "inbox.view"
  | "task.view"
  | "dashboard.view.published"
  | "template.view"
  | "workspace.view"
  | "project.view"
  | "project.edit"
  | "project.manage.team"
  | "project.archive"
  | "project.delete"
  | "document.view"
  | "document.create"
  | "document.edit"
  | "document.delete"
  | "artifact.create"
  | "task.create"
  | "task.edit"
  | "task.delete"
  | "task.assign"
  | "task.bulk.update";

function toLowerPlatform(upper: PlatformRole): EffectivePlatformRoleLower {
  if (upper === PLATFORM_ROLE.ADMIN) return "admin";
  if (upper === PLATFORM_ROLE.MEMBER) return "member";
  return "viewer";
}

type UserLike = Parameters<typeof isPlatformAdmin>[0];

/**
 * §2.4 effective UI columns for workspace-scoped project/document rows (§4 #8–13, #25–28).
 * Admin = workspace_owner OR platform ADMIN bypass; Member = workspace_member | delivery_owner;
 * Viewer = platform VIEWER | workspace_viewer | stakeholder.
 */
export function effectiveWorkspaceUiColumns(
  user: UserLike,
  workspaceRole: StoreWorkspaceRole | null,
): { admin: boolean; member: boolean; viewer: boolean } {
  const inAdminColumn =
    isPlatformAdmin(user) || workspaceRole === "workspace_owner";
  const inViewerColumn =
    isPlatformViewer(user) ||
    workspaceRole === "workspace_viewer" ||
    workspaceRole === "stakeholder";
  const inMemberColumn =
    !inAdminColumn &&
    !inViewerColumn &&
    (workspaceRole === "workspace_member" || workspaceRole === "delivery_owner");

  return {
    admin: inAdminColumn,
    member: inMemberColumn,
    viewer: inViewerColumn,
  };
}

export type UseEffectiveRoleResult = {
  /** Normalized lowercase platform role for `is()` / display. */
  platformRole: EffectivePlatformRoleLower;
  /** Uppercase canonical enum value (matches backend / PLATFORM_ROLE). */
  platformRoleUpper: PlatformRole;
  /** Active workspace role from workspace store, if hydrated. */
  workspaceRole: StoreWorkspaceRole | null;
  can: (action: EffectiveAction | (string & {})) => boolean;
  /** `is("paid")` is true for Admin or Member (non-Viewer). */
  is: (role: EffectivePlatformRoleLower | "paid") => boolean;
};

export function useEffectiveRole(): UseEffectiveRoleResult {
  const { user } = useAuth();
  const workspaceRole = useWorkspaceStore((s) => s.workspaceRole);

  const platformRoleUpper = useMemo(() => platformRoleFromUser(user), [user]);
  const platformRole = useMemo(
    () => toLowerPlatform(platformRoleUpper),
    [platformRoleUpper],
  );

  const cols = useMemo(
    () => effectiveWorkspaceUiColumns(user, workspaceRole),
    [user, workspaceRole],
  );

  const can = useCallback(
    (action: EffectiveAction | (string & {})): boolean => {
      const authed = Boolean(user);

      switch (action) {
        case "admin.view":
          return isPlatformAdmin(user);
        case "inbox.view":
          return authed && !isPlatformViewer(user);
        case "task.view":
          return authed;
        case "dashboard.view.published":
          return authed;
        case "template.view":
          return authed;
        case "workspace.view":
          return authed;
        case "project.view":
          return authed;
        case "project.edit":
          return authed && (cols.admin || cols.member);
        case "project.manage.team":
          return authed && (cols.admin || cols.member);
        case "project.archive":
          return authed && cols.admin;
        case "project.delete":
          return authed && cols.admin;
        case "document.view":
          return authed;
        case "document.create":
          return authed && (cols.admin || cols.member);
        case "document.edit":
          return authed && (cols.admin || cols.member);
        case "document.delete":
          return authed && cols.admin;
        case "artifact.create":
          return authed && (cols.admin || cols.member);
        // task.* — workspace-aware (taxonomy §4 rows 19-23). All five resolve
        // identically today (Admin+Member ✓, Viewer ✗); kept separate per
        // taxonomy callsite-clarity convention. Future product nuance (e.g.,
        // "Members edit own tasks only" or "delivery_owner can assign
        // cross-team") will change individual rows without callsite renames.
        case "task.create":
          return authed && (cols.admin || cols.member);
        case "task.edit":
          return authed && (cols.admin || cols.member);
        case "task.delete":
          return authed && (cols.admin || cols.member);
        case "task.assign":
          return authed && (cols.admin || cols.member);
        case "task.bulk.update":
          return authed && (cols.admin || cols.member);
        default:
          return false;
      }
    },
    [user, cols],
  );

  const is = useCallback(
    (role: EffectivePlatformRoleLower | "paid"): boolean => {
      if (role === "paid") {
        return isPlatformAdmin(user) || isPlatformMember(user);
      }
      return platformRole === role;
    },
    [platformRole, user],
  );

  return {
    platformRole,
    platformRoleUpper,
    workspaceRole,
    can,
    is,
  };
}
