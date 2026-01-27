import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cleanupLegacyAuthStorage } from "@/auth/cleanupAuthStorage";

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
  organization?: {
    id: string;
    name: string;
    slug: string;
    features?: {
      enableProgramsPortfolios?: boolean;
    };
  } | null;
  name?: string; // computed field
};
const ACTIVE_WORKSPACE_KEY = "activeWorkspaceId";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
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
  const [activeWorkspaceId, _setActiveWorkspaceId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_WORKSPACE_KEY)
  );

  const setActiveWorkspaceId = (id: string | null) => {
    if (!id) {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
      _setActiveWorkspaceId(null);
      return;
    }
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    _setActiveWorkspaceId(id);
  };

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
        // Call /api/auth/me with cookies - no token needed
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
        // 401 means not authenticated - clear user and let routing handle redirect
        if (error?.response?.status === 401) {
          console.log('[AuthContext] 401 on /auth/me - user not authenticated');
          setUser(null);
        } else {
          console.log('Auth hydration failed:', error);
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
    // Login sets cookies on the backend - no token storage needed
    const response = await api.post("/auth/login", { email, password });
    // API interceptor unwraps the response, so user is at the top level
    
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
    try {
      // Call logout endpoint to clear cookies on backend
      await api.post("/auth/logout", {});
    } catch {}
    // Cleanup any legacy tokens that might exist
    cleanupLegacyAuthStorage();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, activeWorkspaceId, setActiveWorkspaceId, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
};
