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

  // Normalize path for consistent matching
  const raw = String(cfg.url || '');
  const path = raw.startsWith('http') ? new URL(raw).pathname : raw;

  // Check if this is an auth, health, or version endpoint
  const isAuthEndpoint =
    path.startsWith('/auth/') ||
    path.startsWith('auth/') ||
    path.startsWith('/api/auth/') ||
    path.startsWith('api/auth/');

  const isHealthEndpoint =
    path.startsWith('/health') ||
    path.startsWith('/api/health') ||
    path.startsWith('health') ||
    path.startsWith('api/health');

  const isVersionEndpoint =
    path.startsWith('/version') ||
    path.startsWith('/api/version') ||
    path.startsWith('version') ||
    path.startsWith('api/version');

  const shouldSkipWorkspaceHeader = isAuthEndpoint || isHealthEndpoint || isVersionEndpoint;

  if (shouldSkipWorkspaceHeader) {
    // Explicitly remove workspace headers for auth/health/version endpoints
    delete (cfg.headers as any)['X-Workspace-Id'];
    delete (cfg.headers as any)['x-workspace-id'];
    return cfg;
  }

  // For all other endpoints, add workspace header if available
  const wsId = useWorkspaceStore.getState().activeWorkspaceId;

  if (!wsId) {
    // If no workspace ID, ensure headers are removed
    delete (cfg.headers as any)['X-Workspace-Id'];
    delete (cfg.headers as any)['x-workspace-id'];
  } else {
    // Set workspace header when activeWorkspaceId exists
    (cfg.headers as any)['X-Workspace-Id'] = wsId;
    (cfg.headers as any)['x-workspace-id'] = wsId; // Support both cases
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
