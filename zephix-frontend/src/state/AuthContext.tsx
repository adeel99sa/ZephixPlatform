import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setTokens, clearTokens, loadTokensFromStorage, getSessionId } from "@/lib/api";

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

type NavigateFunction = (to: string, options?: { replace?: boolean }) => void;

type AuthCtx = {
  user: User | null;
  loading: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthFromInvite: (authData: {
    user: User;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }) => void;
  completeLoginRedirect: (navigate: NavigateFunction) => Promise<void>;
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
    
    // CRITICAL: Write token to storage IMMEDIATELY before any other operations
    // This ensures token is available for subsequent requests even if state update fails
    setTokens(response.accessToken, response.refreshToken, response.sessionId);
    
    // Add computed name field
    const userWithName = {
      ...response.user,
      name: `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim()
    };
    setUser(userWithName);

    // Debug logging in development (no token material)
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
      const sid = getSessionId();
      await api.post("/auth/logout", { sessionId: sid });
    } catch {}
    clearTokens();
    setUser(null);
  };

  /**
   * Set auth state from invite accept (reuses same logic as login)
   * Used by AcceptInvitePage to store tokens and user after accepting invite
   */
  const setAuthFromInvite = (authData: {
    user: User;
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }) => {
    setTokens(authData.accessToken, authData.refreshToken, authData.sessionId);

    const userWithName = {
      ...authData.user,
      name: `${authData.user.firstName || ''} ${authData.user.lastName || ''}`.trim(),
    };

    setUser(userWithName);
  };

  /**
   * Safe returnUrl navigation helper
   * Prevents open redirect attacks by only allowing same-origin relative paths
   */
  function safeNavigateToReturnUrl(navigate: NavigateFunction): boolean {
    const stored = localStorage.getItem('zephix.returnUrl');
    if (!stored) return false;

    localStorage.removeItem('zephix.returnUrl');

    const trimmed = stored.trim();

    // Block newline and control characters (prevents CRLF and other odd payloads)
    if (/[^\x20-\x7E]/.test(trimmed)) {
      navigate('/home', { replace: true });
      return true;
    }

    // Allow only same origin relative paths
    if (!trimmed.startsWith('/')) {
      navigate('/home', { replace: true });
      return true;
    }

    // Block protocol relative and backslashes
    if (trimmed.startsWith('//') || trimmed.includes('\\')) {
      navigate('/home', { replace: true });
      return true;
    }

    // Optional allowlist of prefixes (includes admin routes)
    const allowedPrefixes = ['/home', '/onboarding', '/workspaces', '/projects', '/w/', '/admin'];
    const allowed = allowedPrefixes.some((p) => trimmed.startsWith(p));
    if (!allowed) {
      navigate('/home', { replace: true });
      return true;
    }

    navigate(trimmed, { replace: true });
    return true;
  }

  /**
   * Complete login redirect logic (reused by both login and invite accept)
   * Checks onboarding status first, then safe returnUrl, then defaults to /home
   */
  const completeLoginRedirect = async (navigate: NavigateFunction) => {
    try {
      const { onboardingApi } = await import('@/services/onboardingApi');
      const status = await onboardingApi.getOnboardingStatus();

      // New response format: hasOrganization, hasWorkspace, next
      if (status.hasOrganization === false) {
        // User has no organization - route to create org
        navigate('/onboarding', { replace: true });
        return;
      }

      if (status.hasOrganization === true && status.hasWorkspace === false) {
        // User has org but no workspace - route to create workspace
        navigate('/onboarding', { replace: true });
        return;
      }

      // Legacy format fallback: check completed flag
      if (status.completed === false) {
        navigate('/onboarding', { replace: true });
        return;
      }
    } catch (error) {
      // On error, check if it's a 403 (user has no org) - route to onboarding
      if (error instanceof Error && error.message.includes('403')) {
        navigate('/onboarding', { replace: true });
        return;
      }
      // Other errors - keep default route
    }

    if (safeNavigateToReturnUrl(navigate)) return;

    navigate('/home', { replace: true });
  };

  return <Ctx.Provider value={{ user, loading, activeWorkspaceId, setActiveWorkspaceId, login, logout, setAuthFromInvite, completeLoginRedirect }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
};
