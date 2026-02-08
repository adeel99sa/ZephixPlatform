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

/** Read the XSRF-TOKEN cookie set by the backend */
function getCsrfCookie(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/** Fetch a fresh CSRF token from the backend (sets the cookie too) */
let csrfFetchPromise: Promise<string | null> | null = null;
async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfCookie();
  if (existing) return existing;

  // Deduplicate concurrent calls
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      await axios.get(`${baseURL}/auth/csrf`, { withCredentials: true });
      return getCsrfCookie();
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

function isHealthUrl(url: string) {
  return url.includes("/health") || url.includes("/version");
}

function isWorkUrl(url: string) {
  return url.startsWith("/work/") || url.includes("/work/");
}

function isProjectsUrl(url: string) {
  return url.startsWith("/projects/") || url.includes("/projects/");
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

    if (wsId) {
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
