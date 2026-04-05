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
  (err) => {
    const method = String(err?.config?.method || "").toLowerCase();
    const url = String(err?.config?.url || "");
    const status = err?.response?.status;

    if (status === 401 && method === "get" && isAuthMeUrl(url)) {
      return null;
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
