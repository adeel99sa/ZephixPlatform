import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setTokens, clearTokens, loadTokensFromStorage } from "@/lib/api";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  platformRole?: string;
  permissions?: {
    isAdmin?: boolean;
    canManageUsers?: boolean;
    canViewProjects?: boolean;
    canManageResources?: boolean;
    canViewAnalytics?: boolean;
  };
  organizationId?: string | null;
  name?: string; // computed field
};
type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// In-memory lock to prevent concurrent /auth/me calls
let hydrating = false;
let hydrationPromise: Promise<void> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate() {
    // Prevent concurrent hydration calls
    if (hydrating && hydrationPromise) {
      console.log('[AuthContext] Hydration already in progress, waiting...');
      await hydrationPromise;
      return;
    }

    hydrating = true;
    hydrationPromise = (async () => {
      try {
        loadTokensFromStorage();
        // API interceptor already unwraps, so response is already the data
        const userData = await api.get("/auth/me");
        // Add computed name field
        const userWithName = {
          ...userData,
          name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        };
        setUser(userWithName);

        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthContext] user loaded:', {
            email: userWithName.email,
            role: userWithName.role,
            platformRole: userWithName.platformRole,
            permissions: userWithName.permissions,
          });
          // Explicitly log permissions.isAdmin for debugging
          console.log('[AuthContext] ⚠️ CRITICAL: permissions.isAdmin =', userWithName.permissions?.isAdmin);
          console.log('[AuthContext] Full permissions object:', JSON.stringify(userWithName.permissions, null, 2));
        }
      } catch (error: any) {
        // Don't log 401 errors as failures if we already have a user - might be a token refresh issue
        if (error?.response?.status === 401) {
          console.warn('[AuthContext] ⚠️ 401 on /auth/me - token may be expired, but keeping existing user if available');
          // If we already have a user, don't clear it - might just be a token refresh issue
          // The API interceptor should handle token refresh
        } else {
          console.log('Auth hydration failed:', error);
        }
        // Don't clear user on 401 - let the API interceptor handle token refresh
        // Only clear if it's a different error
        if (error?.response?.status !== 401) {
          setUser(null);
        }
      } finally {
        setLoading(false);
        hydrating = false;
        hydrationPromise = null;
      }
    })();

    await hydrationPromise;
  }

  useEffect(() => {
    hydrate();
  }, []); // Only run once on mount

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });
    // API interceptor unwraps the response, so tokens are at the top level
    setTokens(response.accessToken, response.refreshToken);
    // Add computed name field
    const userWithName = {
      ...response.user,
      name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim()
    };
    setUser(userWithName);

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthContext] user loaded:', {
        email: userWithName.email,
        role: userWithName.role,
        platformRole: userWithName.platformRole,
        permissions: userWithName.permissions,
      });
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    clearTokens();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
};
