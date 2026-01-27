import axios from "axios";
import { useWorkspaceStore } from "@/state/workspace.store";

// Use Vite proxy in dev (/api -> localhost:3000), full URL in prod
const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "https://zephix-backend-production.up.railway.app/api")
  : "/api"; // Relative path uses Vite proxy in development

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Cookie-based auth - no tokens needed
});

// Removed all token storage functions - using cookies only

api.interceptors.request.use((cfg) => {
  if (!cfg.headers) cfg.headers = {} as any;
  // No Authorization header - cookies are sent automatically with withCredentials: true

  // STEP D: Workspace header safety - read from Zustand store
  // Skip workspace header for auth, health, and version endpoints
  const url = cfg.url || '';
  const isAuthEndpoint = url.includes('/api/auth') || url.includes('/auth/');
  const isHealthEndpoint = url.includes('/api/health') || url.includes('/health');
  const isVersionEndpoint = url.includes('/api/version') || url.includes('/version');
  const shouldSkipWorkspaceHeader = isAuthEndpoint || isHealthEndpoint || isVersionEndpoint;

  if (!shouldSkipWorkspaceHeader) {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;

    // STEP D: If activeWorkspaceId is null, delete headers to prevent stale context
    if (!wsId) {
      delete cfg.headers?.['X-Workspace-Id'];
      delete cfg.headers?.['x-workspace-id'];
      
      // Development log for debugging
      if (import.meta.env.MODE === 'development') {
        console.log('[API] Workspace header removed - activeWorkspaceId is null', {
          url: cfg.url,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // STEP D: Set header only when activeWorkspaceId exists
      cfg.headers['X-Workspace-Id'] = wsId;
      cfg.headers['x-workspace-id'] = wsId; // Support both cases
      
      // Development log for debugging
      if (import.meta.env.MODE === 'development') {
        console.log('[API] Workspace header injected', {
          workspaceId: wsId,
          url: cfg.url,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return cfg;
});

api.interceptors.response.use(
  (res) => {
    // if server returns envelope: { data: <resource>, meta? }
    if (res?.data && typeof res.data === "object" && "data" in res.data) {
      return res.data.data;
    }
    return res.data ?? res;
  },
  async (err) => {
    const original = err.config;

    // 401 → redirect to login (cookies handle refresh on backend)
    // BUT: Don't redirect if we're on the login page or during login
    if (err.response?.status === 401) {
      console.log('[Auth] 401 error - not authenticated');

      const isAdminRoute = window.location.pathname.startsWith('/admin');
      const isLoginPage = window.location.pathname.includes('/login');
      const isSignupPage = window.location.pathname.includes('/signup');

      // Never redirect from login/signup pages or admin routes
      if (!isLoginPage && !isSignupPage && !isAdminRoute) {
        // Only redirect if not already going to login (prevents loops)
        console.log('[Auth] Redirecting to login (not on login/signup/admin route)');
        window.location.href = "/login?reason=session_expired";
      } else if (isAdminRoute) {
        console.warn('[Auth] On admin route, not redirecting - AdminRoute will handle access denial');
      }
    }

    // Log request ID for traceability
    console.warn('[api] error', {
      status: err.response?.status,
      path: err.config?.url,
      requestId: err.response?.headers?.['x-request-id'],
    });

    throw err;
  }
);
