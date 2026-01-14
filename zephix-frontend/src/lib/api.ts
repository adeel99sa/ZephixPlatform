import axios from "axios";

// Derive from env once
const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "/api"; // dev proxies; prod full URL

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let accessToken: string | null = null;
let refreshToken: string | null = null;
let sessionId: string | null = null;

export function setTokens(at: string, rt?: string, sid?: string) {
  accessToken = at;
  if (rt) refreshToken = rt;
  if (sid) sessionId = sid;
  localStorage.setItem("zephix.at", accessToken ?? "");
  if (rt) localStorage.setItem("zephix.rt", refreshToken ?? "");
  if (sid) localStorage.setItem("zephix.sessionId", sessionId ?? "");

  // CRITICAL: Also sync to zephix-auth-storage for apiClient compatibility
  // This ensures both API clients can find the tokens
  try {
    const existingStorage = localStorage.getItem('zephix-auth-storage');
    const state = existingStorage ? JSON.parse(existingStorage).state : {};
    const updatedState = {
      ...state,
      accessToken: at,
      refreshToken: rt || state.refreshToken,
      sessionId: sid || state.sessionId,
    };
    localStorage.setItem('zephix-auth-storage', JSON.stringify({ state: updatedState }));
  } catch (error) {
    // Ignore errors syncing to legacy storage
  }
}

export function clearTokens() {
  accessToken = null; refreshToken = null; sessionId = null;
  localStorage.removeItem("zephix.at");
  localStorage.removeItem("zephix.rt");
  localStorage.removeItem("zephix.sessionId");
  // Also clear legacy storage
  localStorage.removeItem("zephix-auth-storage");
}

export function getSessionId(): string | null {
  return sessionId || localStorage.getItem("zephix.sessionId");
}

export function loadTokensFromStorage() {
  accessToken = localStorage.getItem("zephix.at");
  refreshToken = localStorage.getItem("zephix.rt");
  sessionId = localStorage.getItem("zephix.sessionId");
}

api.interceptors.request.use((cfg) => {
  if (!cfg.headers) cfg.headers = {} as any;
  // Load from storage on every request to handle page refresh
  const token = accessToken || localStorage.getItem("zephix.at");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing: Promise<string | null> | null = null;
let queuedRequests: Array<{ resolve: (token: string | null) => void; reject: (err: any) => void }> = [];

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

    // 401 → try refresh → retry once → hard logout on second failure
    if (err.response?.status === 401 && !original._retry) {
      // Load refresh token from storage (might have been updated)
      loadTokensFromStorage();

      console.log('[Auth] 401 error detected, checking refresh token:', {
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken?.length,
        currentPath: window.location.pathname,
        requestUrl: original.url,
      });

      if (!refreshToken) {
        console.warn('[Auth] 401 error but no refresh token available - cannot refresh');
        // No refresh token, can't refresh - this will fall through to second 401 handler
      } else {
        original._retry = true;

        // If refresh is already in progress, queue this request
        if (refreshing) {
          console.log('[Auth] Refresh already in progress, queueing request:', original.url);
          return new Promise((resolve, reject) => {
            queuedRequests.push({ resolve, reject });
            refreshing!.then((token) => {
              if (token) {
                if (!original.headers) original.headers = {};
                original.headers.Authorization = `Bearer ${token}`;
                resolve(api(original));
              } else {
                reject(err);
              }
            }).catch(reject);
          });
        }

        // Start refresh process
        refreshing = (async () => {
          try {
            console.log('[Auth] Attempting token refresh...', {
              hasRefreshToken: !!refreshToken,
              refreshTokenLength: refreshToken?.length,
            });

            const currentSessionId = getSessionId();
            const response = await axios.post("/api/auth/refresh", {
              refreshToken,
              sessionId: currentSessionId || undefined,
            });

            // Handle different response formats
            let tokens;
            if (response.data?.data) {
              // Envelope format: { data: { accessToken, refreshToken } }
              tokens = response.data.data;
            } else if (response.data?.accessToken) {
              // Direct format: { accessToken, refreshToken }
              tokens = response.data;
            } else {
              // Fallback: assume response.data is the tokens
              tokens = response.data;
            }

            if (!tokens?.accessToken) {
              throw new Error('Refresh response missing accessToken');
            }

            setTokens(tokens.accessToken, tokens.refreshToken || refreshToken, tokens.sessionId);
            console.log('[Auth] ✅ Token refresh successful');

            // Resolve all queued requests
            const token = tokens.accessToken as string;
            queuedRequests.forEach(({ resolve }) => resolve(token));
            queuedRequests = [];

            return token;
          } catch (refreshErr: any) {
            console.error('[Auth] ❌ Refresh failed:', refreshErr?.response?.status, refreshErr?.message);
            clearTokens();

            // Reject all queued requests
            queuedRequests.forEach(({ reject }) => reject(refreshErr));
            queuedRequests = [];

            // Clear auth and redirect to login on refresh failure
            const isLoginPage = window.location.pathname.includes('/login');
            if (!isLoginPage) {
              console.log('[Auth] Refresh failed, redirecting to login');
              window.location.href = "/login?reason=session_expired";
            }
            return null;
          } finally {
            refreshing = null;
          }
        })();
      }

      const newAT = await refreshing;
      if (newAT) {
        // Update the authorization header and retry the original request
        if (!original.headers) original.headers = {};
        original.headers.Authorization = `Bearer ${newAT}`;
        console.log('[Auth] Token refreshed, retrying original request:', original.url);
        return api(original);
      } else {
        // Refresh failed, but don't redirect here - let the second 401 handler do it
        console.warn('[Auth] Token refresh returned null, request will fail');
      }
    }

    // Second 401 after refresh → hard logout
    if (err.response?.status === 401 && original._retry) {
      console.error('[Auth] Second 401 after refresh, forcing logout');
      clearTokens();

      // Don't redirect if we're on an admin route - let AdminRoute handle it
      // This prevents redirect loops when trying to access admin pages
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      const isLoginPage = window.location.pathname.includes('/login');

      if (!isLoginPage && !isAdminRoute) {
        console.log('[Auth] Redirecting to login (not on admin route)');
        window.location.href = "/login?reason=session_expired";
      } else if (isAdminRoute) {
        console.warn('[Auth] On admin route, not redirecting - AdminRoute will handle access denial');
        // Don't redirect - let AdminRoute show /403 or handle it
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
