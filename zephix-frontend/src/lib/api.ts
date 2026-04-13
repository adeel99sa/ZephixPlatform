import axios from "axios";
import { useWorkspaceStore } from "@/state/workspace.store";

const PROD_DEFAULT = "https://zephix-backend-production.up.railway.app/api";

const baseURL = import.meta.env.PROD
  ? (String(import.meta.env.VITE_API_URL || PROD_DEFAULT).replace(/\/+$/, ""))
  : "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/* ─── CSRF Token helpers ──────────────────────────────────────── */

/**
 * In-memory CSRF token store.
 * We store the token from the API response body instead of relying on cookies,
 * because cross-origin deployments (frontend/backend on different subdomains)
 * prevent the frontend from reading cookies set by the backend.
 */
let csrfTokenCache: string | null = null;

/**
 * Phase 14 (2026-04-09) — Public hook to invalidate the CSRF cache.
 *
 * Must be called by the auth flow on logout AND on login (to clear any
 * cache from a previous session). Without this, the module-level
 * `csrfTokenCache` survives across logins until the page reloads,
 * causing 403 / "CSRF token is required" errors on the new session's
 * first mutating request.
 *
 * The 403 response interceptor below also clears the cache + retries,
 * but that's a recovery path. Logout/login should clear proactively.
 */
export function clearCsrfTokenCache(): void {
  csrfTokenCache = null;
}

/** Read the XSRF-TOKEN cookie (works for same-origin only, fallback) */
function getCsrfCookie(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/** Fetch a fresh CSRF token from the backend */
let csrfFetchPromise: Promise<string | null> | null = null;
async function ensureCsrfToken(): Promise<string | null> {
  // Try in-memory cache first, then cookie fallback
  if (csrfTokenCache) return csrfTokenCache;
  const cookie = getCsrfCookie();
  if (cookie) { csrfTokenCache = cookie; return cookie; }

  // Deduplicate concurrent calls
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      const res = await axios.get(`${baseURL}/auth/csrf`, { withCredentials: true });
      // Backend returns { token, csrfToken } in the response body — use that
      // instead of reading cookies (which fails cross-origin)
      const token = res.data?.csrfToken || res.data?.token || getCsrfCookie();
      if (token) csrfTokenCache = token;
      return token || null;
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

const MUTATING_METHODS = ["post", "put", "patch", "delete"];

/* ─── URL classification ─────────────────────────────────────── */

function isAuthUrl(url: string) {
  return url.includes("/auth/");
}

function isAuthMeUrl(url: string) {
  return url.endsWith("/auth/me") || url.includes("/auth/me?");
}

function isHealthUrl(url: string) {
  return url.includes("/health") || url.includes("/version");
}

function isWorkUrl(url: string) {
  return url.startsWith("/work/") || url.includes("/work/");
}

function isProjectsUrl(url: string) {
  return url.startsWith("/projects/") || url.includes("/projects/");
}

/** Organization admin API — must not send x-workspace-id (tenant interceptor validates it and can 403). */
function isOrgAdminApiPath(url: string): boolean {
  const pathOnly = String(url || "").split("?")[0].replace(/^\/+/, "");
  return pathOnly.startsWith("admin/") || pathOnly.includes("/admin/");
}

/** POST /workspaces (org-level create) must not send x-workspace-id — creation is not scoped to the current workspace. */
function isPostWorkspaceRootCreate(url: string, method: string): boolean {
  if (method.toLowerCase() !== "post") return false;
  const pathOnly = String(url || "").split("?")[0];
  const trimmed = pathOnly.replace(/^\/+|\/+$/g, "");
  return trimmed === "workspaces";
}

/* ─── Request interceptor ────────────────────────────────────── */

api.interceptors.request.use(async (cfg) => {
  const url = String(cfg.url || "");
  const skipWorkspace = isAuthUrl(url) || isHealthUrl(url);

  if (!cfg.headers) cfg.headers = {} as any;

  // ── CSRF: attach token on every mutating request ──
  const method = (cfg.method || "get").toLowerCase();
  if (MUTATING_METHODS.includes(method) && !isAuthUrl(url) && !isHealthUrl(url)) {
    const token = await ensureCsrfToken();
    if (token) {
      (cfg.headers as any)["x-csrf-token"] = token;
    }
  }

  // ── Workspace header ──
  if (!skipWorkspace) {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;

    // Org-admin routes are org-scoped; stale workspace header breaks them (403) on staging/shell.
    if (isOrgAdminApiPath(url)) {
      delete (cfg.headers as any)["x-workspace-id"];
      return cfg;
    }

    // Fail fast for routes that require workspace context
    if ((isWorkUrl(url) || isProjectsUrl(url)) && !wsId) {
      const err: any = new Error("WORKSPACE_REQUIRED");
      err.code = "WORKSPACE_REQUIRED";
      err.meta = { url };
      throw err;
    }

    if (wsId && !isPostWorkspaceRootCreate(url, method)) {
      (cfg.headers as any)["x-workspace-id"] = wsId;
    } else {
      delete (cfg.headers as any)["x-workspace-id"];
    }
  }

  return cfg;
});

api.interceptors.response.use(
  (res) => {
    const data = res?.data;
    if (data && typeof data === "object" && "data" in data) return (data as any).data;
    return data;
  },
  async (err) => {
    const method = String(err?.config?.method || "").toLowerCase();
    const url = String(err?.config?.url || "");
    const status = err?.response?.status;

    if (status === 401 && method === "get" && isAuthMeUrl(url)) {
      return null;
    }

    /*
     * Phase 14 (2026-04-09) — Auto-recover from stale CSRF token.
     *
     * When the backend session-token rotates (e.g. JWT refresh), it
     * issues a new CSRF token tied to the new session. The in-memory
     * `csrfTokenCache` still holds the OLD token from the previous
     * session, so the next mutating request fails with 403 +
     * "CSRF token is required".
     *
     * Symptoms before this fix:
     *   - User clicks Create Project → 403 / "CSRF token is required"
     *   - Logging out and back in does NOT fix it because the
     *     csrfTokenCache module-level state survives across logins
     *     until the page reloads.
     *
     * Fix:
     *   - Detect 403 + CSRF marker (status code OR error body code)
     *   - Invalidate csrfTokenCache
     *   - Re-fetch a fresh token
     *   - Retry the original request ONCE
     *   - If retry also fails, surface the original error so we don't
     *     loop forever
     *
     * This is a per-request retry, not a global recovery — it only
     * fires for mutating requests that hit a CSRF 403, and only retries
     * once. The `__csrfRetried` flag on the config prevents infinite
     * loops if the backend keeps rejecting.
     */
    const isCsrfError =
      status === 403 &&
      (err?.response?.data?.code === "CSRF_TOKEN_MISSING" ||
        err?.response?.data?.code === "CSRF_TOKEN_INVALID" ||
        /csrf/i.test(String(err?.response?.data?.message || "")));

    const cfg = err?.config;
    if (isCsrfError && cfg && !cfg.__csrfRetried) {
      cfg.__csrfRetried = true;
      // Invalidate the cache so ensureCsrfToken fetches fresh.
      csrfTokenCache = null;
      try {
        const fresh = await ensureCsrfToken();
        if (fresh) {
          // Set the new token on the retry config and re-issue.
          if (!cfg.headers) cfg.headers = {} as any;
          (cfg.headers as any)["x-csrf-token"] = fresh;
          return api.request(cfg);
        }
      } catch {
        // Fall through to throw original error.
      }
    }

    throw err;
  }
);

/**
 * Unwrap nested data response from backend.
 * Backend may return { data: T } or T directly.
 */
export function unwrapApiData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

/**
 * Typed request wrapper that returns the unwrapped payload directly.
 * The response interceptor already unwraps data, so these return T, not AxiosResponse<T>.
 * 
 * Usage:
 *   const user = await request.get<User>('/users/me');
 *   // user is of type User, not AxiosResponse<User>
 * 
 * IMPORTANT: Use this for all new code. The raw `api` export is for legacy only.
 */
export const request = {
  get: <T = unknown>(url: string, config?: Parameters<typeof api.get>[1]): Promise<T> =>
    api.get(url, config) as unknown as Promise<T>,
  post: <T = unknown>(url: string, data?: unknown, config?: Parameters<typeof api.post>[2]): Promise<T> =>
    api.post(url, data, config) as unknown as Promise<T>,
  put: <T = unknown>(url: string, data?: unknown, config?: Parameters<typeof api.put>[2]): Promise<T> =>
    api.put(url, data, config) as unknown as Promise<T>,
  patch: <T = unknown>(url: string, data?: unknown, config?: Parameters<typeof api.patch>[2]): Promise<T> =>
    api.patch(url, data, config) as unknown as Promise<T>,
  delete: <T = unknown>(url: string, config?: Parameters<typeof api.delete>[1]): Promise<T> =>
    api.delete(url, config) as unknown as Promise<T>,
};

/** @deprecated Use `request` instead. This alias exists for migration. */
export const typedApi = request;

// Default export for backward compatibility
export default api;
