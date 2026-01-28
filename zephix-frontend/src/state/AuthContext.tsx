import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

type AuthUser = {
  id: string;
  email: string;
  role?: string;
  platformRole?: "ADMIN" | "MEMBER" | "VIEWER";
  firstName?: string;
  lastName?: string;
  organizationId?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, opts?: { returnUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isInternalReturnUrl(u?: string) {
  if (!u) return false;
  if (!u.startsWith("/")) return false;
  if (u.startsWith("//")) return false;
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const inflight = useRef<Promise<AuthUser | null> | null>(null);
  const hydratedOnce = useRef(false);

  async function hydrate(): Promise<AuthUser | null> {
    if (inflight.current) return inflight.current;

    inflight.current = (async () => {
      try {
        const me = await api.get("/auth/me");
        const u = (me as any)?.user ?? me;
        setUser(u ?? null);
        return u ?? null;
      } catch (e: any) {
        setUser(null);
        return null;
      } finally {
        inflight.current = null;
        setIsLoading(false);
      }
    })();

    return inflight.current;
  }

  async function login(email: string, password: string, opts?: { returnUrl?: string }) {
    setIsLoading(true);
    await api.post("/auth/login", { email, password });
    const u = await hydrate();

    const url = opts?.returnUrl;
    if (u && isInternalReturnUrl(url)) {
      window.location.assign(url!);
      return;
    }

    if (u) {
      window.location.assign("/home");
      return;
    }

    window.location.assign("/login?reason=not_authenticated");
  }

  async function logout() {
    setIsLoading(true);
    try {
      await api.post("/auth/logout");
    } catch (e) {
    } finally {
      setUser(null);
      setIsLoading(false);
      window.location.assign("/login");
    }
  }

  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    hydrate();
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout, hydrate }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
