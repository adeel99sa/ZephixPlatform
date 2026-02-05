import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { request } from "@/lib/api";
import { cleanupLegacyAuthStorage } from "@/auth/cleanupAuthStorage";

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
      const res = await request.get<{ user?: AuthUser } | AuthUser>("/auth/me");
      const userData = res as { user?: AuthUser };
      const user = (userData?.user || res) as AuthUser | null;
      return user || null;
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
      setUser(me);
      setIsLoading(false);
    })();
  }, []);

  async function refreshMe() {
    const me = await fetchMeSingleFlight();
    setUser(me);
    return me;
  }

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      await request.post("/auth/login", { email, password });
      const me = await fetchMeSingleFlight();
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
