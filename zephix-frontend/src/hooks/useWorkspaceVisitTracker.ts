import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

const LAST_KEY = "zephix_last_workspace_v1";
const RECENT_KEY = "zephix_recent_workspaces_v1";

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

export function useWorkspaceVisitTracker(opts?: { workspaceId?: string; workspaceName?: string }) {
  const loc = useLocation();
  const params = useParams();

  useEffect(() => {
    const slug = (params as any).slug as string | undefined;
    const id = opts?.workspaceId;
    if (!id) return;

    if (!loc.pathname.startsWith("/w/") && !loc.pathname.startsWith("/workspaces/")) return;

    const ref = { id, slug, name: opts?.workspaceName, ts: Date.now() };
    safeWrite(LAST_KEY, ref);

    const recent = safeRead<any[]>(RECENT_KEY) || [];
    const next = [ref, ...recent.filter((r) => r?.id !== id)].slice(0, 8);
    safeWrite(RECENT_KEY, next);
  }, [loc.pathname, opts?.workspaceId, (params as any).slug]);
}
