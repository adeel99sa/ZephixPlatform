/**
 * Org + active-workspace effective role hook for shell and feature gating.
 * Uses canonical helpers from @/utils/access and @/utils/roles (Rule A).
 *
 * @see docs/adrs/ADR-001-workspace-is-the-container.md
 * @see zephix-frontend/src/utils/RBAC-CANONICAL-HELPERS.md
 */
import { useCallback, useMemo } from "react";

import { useAuth } from "@/state/AuthContext";
import { useWorkspaceStore } from "@/state/workspace.store";
import type { WorkspaceRole as StoreWorkspaceRole } from "@/state/workspace.store";
import {
  canCreateOrgWorkspace,
  canManageTemplates,
  isPlatformAdmin,
  isPlatformMember,
  isPlatformViewer,
} from "@/utils/access";
import { platformRoleFromUser, PLATFORM_ROLE, type PlatformRole } from "@/utils/roles";

/** Lowercase platform role for UI comparisons (matches workstream contract). */
export type EffectivePlatformRoleLower = "admin" | "member" | "viewer";

/** Capability tokens for shell-level gating; extend here as Week 2+ surfaces adopt the hook. */
export type EffectiveAction =
  | "admin.access"
  | "admin.profileMenu"
  | "inbox.nav"
  | "home.nav"
  | "myWork.nav"
  | "favorites.nav"
  | "workspaces.tree"
  | "dashboards.nav"
  | "shared.nav"
  | "templates.nav"
  | "settings.nav"
  | "workspace.manage";

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
      switch (action) {
        case "admin.access":
        case "admin.profileMenu":
          return isPlatformAdmin(user);
        case "inbox.nav":
          return !isPlatformViewer(user);
        case "home.nav":
        case "workspaces.tree":
        case "shared.nav":
          return Boolean(user);
        case "myWork.nav":
          return isPlatformAdmin(user) || isPlatformMember(user);
        case "favorites.nav":
          return !isPlatformViewer(user);
        case "dashboards.nav":
          return isPlatformAdmin(user) || isPlatformMember(user);
        case "templates.nav":
          return isPlatformAdmin(user) || isPlatformMember(user);
        case "settings.nav":
          return !isPlatformViewer(user);
        case "workspace.manage":
          return (
            canCreateOrgWorkspace(user) ||
            canManageTemplates(platformRoleUpper, workspaceRole ?? undefined)
          );
        default:
          return false;
      }
    },
    [user, platformRoleUpper, workspaceRole],
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
