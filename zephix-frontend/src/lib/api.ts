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

export function setTokens(at: string, rt?: string) {
  accessToken = at;
  if (rt) refreshToken = rt;
  localStorage.setItem("zephix.at", accessToken ?? "");
  if (rt) localStorage.setItem("zephix.rt", refreshToken ?? "");
}

export function clearTokens() {
  accessToken = null; refreshToken = null;
  localStorage.removeItem("zephix.at");
  localStorage.removeItem("zephix.rt");
}

export function loadTokensFromStorage() {
  accessToken = localStorage.getItem("zephix.at");
  refreshToken = localStorage.getItem("zephix.rt");
}

api.interceptors.request.use((cfg) => {
  if (!cfg.headers) cfg.headers = {};
  // Load from storage on every request to handle page refresh
  const token = accessToken || localStorage.getItem("zephix.at");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

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
    if (err.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;
      
      if (!refreshing) {
        refreshing = (async () => {
          try {
            const { data } = await axios.post("/api/auth/refresh", { refreshToken });
            // Handle envelope format: { data: { accessToken, refreshToken } }
            const tokens = data.data || data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            return tokens.accessToken as string;
          } catch (refreshErr) {
            console.error('[Auth] Refresh failed, logging out', refreshErr);
            clearTokens();
            // Redirect to login on refresh failure
            window.location.href = "/login?reason=session_expired";
            return null;
          } finally { refreshing = null; }
        })();
      }
      
      const newAT = await refreshing;
      if (newAT) {
        original.headers = { ...(original.headers||{}), Authorization: `Bearer ${newAT}` };
        return api(original);
      }
    }
    
    // Second 401 after refresh → hard logout
    if (err.response?.status === 401 && original._retry) {
      console.error('[Auth] Second 401 after refresh, forcing logout');
      clearTokens();
      window.location.href = "/login?reason=session_expired";
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
