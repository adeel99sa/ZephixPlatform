import axios from "axios";
import { useWorkspaceStore } from "@/state/workspace.store";

const PROD_DEFAULT = "https://zephix-backend-production.up.railway.app/api";

const baseURL = import.meta.env.PROD
  ? (String(import.meta.env.VITE_API_URL || PROD_DEFAULT).replace(/\/+$/, ""))
  : "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

function isAuthUrl(url: string) {
  return url.includes("/auth/");
}

function isHealthUrl(url: string) {
  return url.includes("/health") || url.includes("/version");
}

api.interceptors.request.use((cfg) => {
  const url = String(cfg.url || "");
  const skipWorkspace = isAuthUrl(url) || isHealthUrl(url);

  if (!cfg.headers) cfg.headers = {} as any;

  if (!skipWorkspace) {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;
    if (wsId) {
      (cfg.headers as any)["X-Workspace-Id"] = wsId;
      (cfg.headers as any)["x-workspace-id"] = wsId;
    } else {
      delete (cfg.headers as any)["X-Workspace-Id"];
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
