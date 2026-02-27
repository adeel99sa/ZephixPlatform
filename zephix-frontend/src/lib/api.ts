import axios from "axios";
import { useWorkspaceStore } from "@/state/workspace.store";
import {
  recordNetworkFailure,
  recordNetworkRequest,
} from "@/lib/staging/debug-capture";
import { resolveRuntimeApiBase } from "@/lib/runtime-api-base";

const runtimeApi = resolveRuntimeApiBase();
const baseURL = runtimeApi.resolvedApiUrl;

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

/** Keep CSRF token in-memory for cross-host staging setups. */
let csrfTokenCache: string | null = null;

/** Fetch a fresh CSRF token from the backend (also sets cookie server-side). */
let csrfFetchPromise: Promise<string | null> | null = null;
function clearCsrfTokenCache(): void {
  csrfTokenCache = null;
}

export function resetCsrfTokenCache(): void {
  clearCsrfTokenCache();
}

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfTokenCache) return csrfTokenCache;

  // Deduplicate concurrent calls
  if (csrfFetchPromise) return csrfFetchPromise;

  csrfFetchPromise = (async () => {
    try {
      const response = await axios.get(`${baseURL}/auth/csrf`, { withCredentials: true });
      const payload = response?.data;
      const token =
        payload?.token ||
        payload?.csrfToken ||
        payload?.data?.token ||
        payload?.data?.csrfToken ||
        null;
      csrfTokenCache = typeof token === "string" && token.length > 0 ? token : null;
      return csrfTokenCache;
    } catch {
      return null;
    } finally {
      csrfFetchPromise = null;
    }
  })();

  return csrfFetchPromise;
}

const MUTATING_METHODS = ["post", "put", "patch", "delete"];

function isCsrfError(err: any): boolean {
  const status = err?.response?.status;
  const code = err?.response?.data?.code;
  return (
    status === 403 &&
    (code === "CSRF_TOKEN_MISSING" ||
      code === "CSRF_INVALID" ||
      code === "CSRF_TOKEN_MISMATCH")
  );
}

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

function isCsrfBootstrapUrl(url: string) {
  return url.includes("/auth/csrf");
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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  (cfg.headers as any)["x-request-id"] = requestId;
  (cfg.headers as any)["x-correlation-id"] = correlationId;
  (cfg as any).metadata = {
    startTime: Date.now(),
    requestId,
    correlationId,
    method: String(cfg.method || "get").toUpperCase(),
    url,
  };

  const skipWorkspace = isAuthUrl(url) || isHealthUrl(url);

  if (!cfg.headers) cfg.headers = {} as any;

  // ── CSRF: attach token on every mutating request ──
  const method = (cfg.method || "get").toLowerCase();
  if (
    MUTATING_METHODS.includes(method) &&
    !isHealthUrl(url) &&
    !isCsrfBootstrapUrl(url)
  ) {
    const token = await ensureCsrfToken();
    if (token) {
      (cfg.headers as any)["X-CSRF-Token"] = token;
      (cfg.headers as any)["X-XSRF-TOKEN"] = token;
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
    recordNetworkRequest({
      timestamp: new Date().toISOString(),
      method: String((res.config as any)?.metadata?.method || res.config?.method || "GET"),
      url: String((res.config as any)?.metadata?.url || res.config?.url || ""),
      status: res.status,
      ok: true,
      requestId:
        String(res.headers?.["x-request-id"] || "") ||
        String((res.config as any)?.metadata?.requestId || ""),
      correlationId:
        String(res.headers?.["x-correlation-id"] || "") ||
        String((res.config as any)?.metadata?.correlationId || ""),
    });
    const data = res?.data;
    if (data && typeof data === "object" && "data" in data) return (data as any).data;
    return data;
  },
  async (err) => {
    const original = err?.config as any;
    const method = String(original?.method || "").toLowerCase();
    const url = String(original?.url || "");
    const isMutating = MUTATING_METHODS.includes(method);
    const status = err?.response?.status;

    // Treat auth bootstrap 401 as a normal "not logged in" state.
    // Keep all other 401 handling unchanged.
    if (status === 401 && method === "get" && isAuthMeUrl(url)) {
      return null;
    }

    recordNetworkRequest({
      timestamp: new Date().toISOString(),
      method: String(original?.metadata?.method || method || "GET").toUpperCase(),
      url: String(original?.metadata?.url || url || ""),
      status: status || null,
      ok: false,
      requestId:
        String(err?.response?.headers?.["x-request-id"] || "") ||
        String(original?.metadata?.requestId || ""),
      correlationId:
        String(err?.response?.headers?.["x-correlation-id"] || "") ||
        String(original?.metadata?.correlationId || ""),
    });
    recordNetworkFailure({
      timestamp: new Date().toISOString(),
      method: String(original?.metadata?.method || method || "GET").toUpperCase(),
      url: String(original?.metadata?.url || url || ""),
      status: status || null,
      requestId:
        String(err?.response?.headers?.["x-request-id"] || "") ||
        String(original?.metadata?.requestId || ""),
      correlationId:
        String(err?.response?.headers?.["x-correlation-id"] || "") ||
        String(original?.metadata?.correlationId || ""),
      responseSnippet: (() => {
        const body = err?.response?.data;
        if (!body) return null;
        const raw = typeof body === "string" ? body : JSON.stringify(body);
        return raw.slice(0, 400);
      })(),
    });

    if (isMutating && !isCsrfBootstrapUrl(url) && isCsrfError(err) && !original?._csrfRetry) {
      original._csrfRetry = true;
      clearCsrfTokenCache();
      await ensureCsrfToken();
      return api.request(original);
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
