/**
 * Frontend mirrors of org/workspace role checks — UX only; API remains authoritative.
 */
import {
  isPlatformAdmin,
  isPlatformMember,
  isPlatformViewer,
} from "@/utils/access";
import { normalizePlatformRole, PLATFORM_ROLE } from "@/utils/roles";
import type { AuthUserLike } from "./auth.types";

export { isPlatformAdmin, isPlatformMember, isPlatformViewer };

export function userMeetsMinOrgRole(
  user: AuthUserLike | null | undefined,
  min: "admin" | "member" | "viewer",
): boolean {
  if (!user) return false;
  const r = normalizePlatformRole(user.platformRole || user.role);
  if (min === "viewer") return true;
  if (min === "member") return r !== PLATFORM_ROLE.VIEWER;
  return r === PLATFORM_ROLE.ADMIN;
}

export function canUseAdministrationPeopleUi(user: AuthUserLike | null | undefined): boolean {
  return isPlatformAdmin(user);
}
