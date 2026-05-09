import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/state/AuthContext";
import { userMeetsMinOrgRole } from "./role-checks";
import type { AuthUserLike } from "./auth.types";

export type UseAuthGuardOptions = {
  /** When true (default), unauthenticated users go to login with returnUrl. */
  requireAuth?: boolean;
  /** Minimum platform org role required for this surface. */
  minOrgRole?: "admin" | "member" | "viewer";
};

function safeReturnUrl(raw: string): string {
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/inbox";
  return raw;
}

/**
 * Client-side route guard for shells that are not wrapped by `ProtectedRoute`.
 * Prefer declarative redirects in `App.tsx` where possible; use this inside pages
 * when a hook-based check is clearer.
 */
export function useAuthGuard(options: UseAuthGuardOptions): { checking: boolean } {
  const requireAuth = options.requireAuth !== false;
  const minOrgRole = options.minOrgRole;
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !user) {
      const ret = safeReturnUrl(`${loc.pathname}${loc.search || ""}`);
      navigate(`/login?returnUrl=${encodeURIComponent(ret)}`, { replace: true });
      return;
    }

    if (minOrgRole && !userMeetsMinOrgRole(user as AuthUserLike, minOrgRole)) {
      navigate("/403?reason=need_org_admin", { replace: true });
    }
  }, [loading, user, requireAuth, minOrgRole, navigate, loc.pathname, loc.search]);

  return { checking: loading };
}
