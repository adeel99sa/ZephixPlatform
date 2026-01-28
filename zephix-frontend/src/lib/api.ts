import axios from "axios";
import { useWorkspaceStore } from "@/state/workspace.store";

const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "https://zephix-backend-production.up.railway.app/api")
  : "/api";

function isAuthPath(url: string) {
  const u = url || "";
  return u.startsWith("/auth/") || u.includes("/auth/");
}

function isHealthPath(url: string) {
  const u = url || "";
  return u.startsWith("/health") || u.includes("/health") || u.startsWith("/version") || u.includes("/version");
}

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  if (!cfg.headers) cfg.headers = {} as any;

  const url = cfg.url || "";
  const skipWorkspaceHeader = isAuthPath(url) || isHealthPath(url);

  if (!skipWorkspaceHeader) {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;
    if (!wsId) {
      delete (cfg.headers as any)["X-Workspace-Id"];
      delete (cfg.headers as any)["x-workspace-id"];
    } else {
      (cfg.headers as any)["X-Workspace-Id"] = wsId;
      (cfg.headers as any)["x-workspace-id"] = wsId;
    }
  }

  return cfg;
});

api.interceptors.response.use(
  (res) => {
    if (res?.data && typeof res.data === "object" && "data" in res.data) {
      return (res.data as any).data;
    }
    return res.data ?? res;
  },
  (err) => {
    if (err.response?.status === 401) {
      const p = window.location.pathname;
      const onAuthPage = p.startsWith("/login") || p.startsWith("/signup") || p.startsWith("/verify-email");
      const onAdmin = p.startsWith("/admin");
      if (!onAuthPage && !onAdmin) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?reason=session_expired&returnUrl=${returnUrl}`;
      }
    }
    throw err;
  }
);
