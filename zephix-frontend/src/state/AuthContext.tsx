import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { request } from "@/lib/api";
import { cleanupLegacyAuthStorage } from "@/auth/cleanupAuthStorage";
import { useWorkspaceStore } from "@/state/workspace.store";

const LAST_ORG_KEY = "zephix.lastOrgId";

function clearWorkspaceScopedClientState() {
  // Clear persisted workspace store first.
  try {
    localStorage.removeItem("workspace-storage");
  } catch {
    // Best effort only.
  }

  // Keep in-memory workspace state aligned in the same tick.
  try {
    useWorkspaceStore.getState().clearActiveWorkspace();
  } catch {
    // Best effort only.
  }

  // Then clear last-workspace restore keys.
  try {
    localStorage.removeItem("zephix.lastWorkspaceId");
    localStorage.removeItem("zephix_last_workspace_v1");
    localStorage.removeItem("zephix_recent_workspaces_v1");
  } catch {
    // Best effort only.
  }
}

function applyOrgChangeReset(currentOrgId: string | null | undefined) {
  // Missing org context: no-op and do not write lastOrgId.
  if (!currentOrgId) return;

  try {
    const lastOrgId = localStorage.getItem(LAST_ORG_KEY);

    // First hydrated org write: set only, never clear.
    if (!lastOrgId) {
      localStorage.setItem(LAST_ORG_KEY, currentOrgId);
      return;
    }

    // Same org: no-op.
    if (lastOrgId === currentOrgId) {
      return;
    }

    // Org changed: clear workspace-scoped state and persist new org marker.
    if (lastOrgId !== currentOrgId) {
      clearWorkspaceScopedClientState();
      localStorage.setItem(LAST_ORG_KEY, currentOrgId);
    }
  } catch {
    // Best effort only.
  }
}

type PlatformRole = "ADMIN" | "MEMBER" | "VIEWER" | "GUEST";

type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  platformRole?: PlatformRole;
  /** @deprecated Use platformRole instead */
  role?: string;
  organizationId?: string;
  permissions?: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  /** @deprecated Use isLoading instead */
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let inFlightMe: Promise<AuthUser | null> | null = null;

async function fetchMeSingleFlight(): Promise<AuthUser | null> {
  if (inFlightMe) return inFlightMe;

  inFlightMe = (async () => {
    try {
      const res = await request.get<Record<string, unknown>>("/auth/me");

      // Accept both shapes:
      // 1) { user: {...} } or { user: null }
      // 2) direct user object {...}
      // Also tolerate legacy wrappers that may still include `data`.
      const payload = (res ?? {}) as Record<string, unknown>;
      const source =
        ((payload.data as Record<string, unknown> | undefined)?.user as
          | Record<string, unknown>
          | null
          | undefined) ??
        ((payload.data as Record<string, unknown> | undefined) as
          | Record<string, unknown>
          | null
          | undefined) ??
        ((payload.user as Record<string, unknown> | null | undefined) as
          | Record<string, unknown>
          | null
          | undefined) ??
        payload;

      if (!source || typeof source !== "object") {
        return null;
      }

      const id =
        (source.id as string | undefined) ||
        (source.userId as string | undefined) ||
        "";
      if (!id) {
        return null;
      }

      const normalized: AuthUser = {
        id,
        email: (source.email as string | undefined) || "",
        firstName: (source.firstName as string | null | undefined) ?? null,
        lastName: (source.lastName as string | null | undefined) ?? null,
        platformRole: (source.platformRole as PlatformRole | undefined) || undefined,
        role: (source.role as string | undefined) || undefined,
        organizationId:
          (source.organizationId as string | undefined) ||
          ((source.organization as { id?: string } | undefined)?.id ?? undefined),
        permissions: (source.permissions as string[] | undefined) || undefined,
      };

      return normalized;
    } catch {
      return null;
    } finally {
      inFlightMe = null;
    }
  })();

  return inFlightMe;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    (async () => {
      setIsLoading(true);
      const me = await fetchMeSingleFlight();
      applyOrgChangeReset(me?.organizationId);
      setUser(me);
      setIsLoading(false);
    })();
  }, []);

  async function refreshMe() {
    const me = await fetchMeSingleFlight();
    applyOrgChangeReset(me?.organizationId);
    setUser(me);
    return me;
  }

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      await request.post("/auth/login", { email, password });
      const me = await fetchMeSingleFlight();
      applyOrgChangeReset(me?.organizationId);
      setUser(me);
      if (!me) throw new Error("Login succeeded but session not established");
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    try {
      await request.post("/auth/logout");
    } catch {
      // Ignore logout API errors - still clear local state
    } finally {
      setUser(null);
      cleanupLegacyAuthStorage();
      // Note: Workspace state should be cleared by the calling component
      // using useWorkspaceStore().clearActiveWorkspace() after logout
      setIsLoading(false);
    }
  }

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      isLoading,
      loading: isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshMe,
    };
  }, [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
