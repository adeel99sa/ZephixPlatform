/**
 * Org + active-workspace effective role hook for shell and feature gating.
 * Uses canonical helpers from @/utils/access and @/utils/roles (Rule A).
 *
 * Capability tokens MUST align with `docs/architecture/role-taxonomy-mvp.md` §4.
 *
 * @see docs/architecture/role-taxonomy-mvp.md
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
 * Shell / cross-surface capability tokens (subset of taxonomy §4).
 * Add new tokens here only when they exist in role-taxonomy-mvp.md §4.
 */
export type EffectiveAction =
  | "admin.view"
  | "inbox.view"
  | "task.view"
  | "dashboard.view.published"
  | "template.view"
  | "workspace.view";

function toLowerPlatform(upper: PlatformRole): EffectivePlatformRoleLower {
  if (upper === PLATFORM_ROLE.ADMIN) return "admin";
  if (upper === PLATFORM_ROLE.MEMBER) return "member";
  return "viewer";
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
        default:
          return false;
      }
    },
    [user],
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
