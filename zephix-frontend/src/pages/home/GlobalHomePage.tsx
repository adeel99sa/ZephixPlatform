import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { request } from "@/lib/api";

type PlatformRole = "ADMIN" | "MEMBER" | "VIEWER" | "GUEST";

type WorkspaceListItem = {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
};

type StoredWorkspaceRef = {
  id: string;
  slug: string;
  name: string;
  ts: number;
};

const LAST_KEY = "zephix_last_workspace_v1";
const RECENT_KEY = "zephix_recent_workspaces_v1";
const RECENT_MAX = 6;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, val: any) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
  }
}

function normalizeRole(role?: PlatformRole): PlatformRole {
  if (!role) return "MEMBER";
  return role;
}

export default function GlobalHomePage() {
  const nav = useNavigate();
  const { user } = useAuth();

  const role = normalizeRole(user?.platformRole as any);

  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const last = useMemo(() => readJson<StoredWorkspaceRef>(LAST_KEY), []);
  const recent = useMemo(() => readJson<StoredWorkspaceRef[]>(RECENT_KEY) || [], []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await request.get<{ items?: WorkspaceListItem[]; data?: WorkspaceListItem[] } | WorkspaceListItem[]>("/workspaces");
        const rawRes = res as { items?: WorkspaceListItem[]; data?: WorkspaceListItem[] } | WorkspaceListItem[];
        const items = Array.isArray(rawRes) ? rawRes : (rawRes?.items || rawRes?.data || []);
        setWorkspaces(Array.isArray(items) ? items : []);
      } catch (e: any) {
        setErr(String(e?.response?.data?.message || e?.message || "Failed to load workspaces"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validById = useMemo(() => {
    const m = new Map<string, WorkspaceListItem>();
    for (const w of workspaces) m.set(w.id, w);
    return m;
  }, [workspaces]);

  const validLast = useMemo(() => {
    if (!last) return null;
    const w = validById.get(last.id);
    if (!w) return null;
    return w;
  }, [last, validById]);

  const validRecent = useMemo(() => {
    const out: WorkspaceListItem[] = [];
    for (const r of recent) {
      const w = validById.get(r.id);
      if (w) out.push(w);
    }
    return out;
  }, [recent, validById]);

  useEffect(() => {
    if (last && !validLast && workspaces.length) {
      localStorage.removeItem(LAST_KEY);
    }

    if (recent.length && workspaces.length) {
      const filtered: StoredWorkspaceRef[] = [];
      for (const r of recent) {
        if (validById.has(r.id)) filtered.push(r);
      }
      writeJson(RECENT_KEY, filtered.slice(0, RECENT_MAX));
    }
  }, [last, validLast, recent, workspaces, validById]);

  const isAdmin = role === "ADMIN";
  const isGuest = role === "GUEST";
  const isMemberLike = !isGuest;

  function goWorkspace(w: WorkspaceListItem) {
    nav(`/w/${w.slug}/home`);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="h-7 w-56 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-xl font-semibold mb-2">Home</div>
          <div className="rounded border p-4 text-sm text-red-700 bg-red-50 border-red-200">{err}</div>
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-2xl font-semibold mb-2">Home</div>
          {isAdmin && (
            <div className="rounded border p-6">
              <div className="text-lg font-medium mb-1">Set up your first workspace</div>
              <div className="text-sm text-gray-600 mb-4">Create a workspace to start projects, tasks, and templates.</div>
              <button
                className="rounded bg-indigo-600 text-white px-4 py-2"
                onClick={() => nav("/workspaces/new")}
              >
                Create workspace
              </button>
            </div>
          )}
          {!isAdmin && !isGuest && (
            <div className="rounded border p-6">
              <div className="text-lg font-medium mb-1">Waiting for access</div>
              <div className="text-sm text-gray-600">Ask an admin to invite you to a workspace.</div>
            </div>
          )}
          {isGuest && (
            <div className="rounded border p-6">
              <div className="text-lg font-medium mb-1">No shared access yet</div>
              <div className="text-sm text-gray-600">You will see shared workspaces here.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="text-2xl font-semibold">Home</div>
          <div className="text-sm text-gray-600">
            {isAdmin ? "Admin view" : isGuest ? "Guest view" : "Member view"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {validLast && (
            <div className="rounded border p-4">
              <div className="text-sm text-gray-600 mb-1">Continue</div>
              <div className="font-medium mb-3">{validLast.name}</div>
              <button
                className="rounded bg-indigo-600 text-white px-3 py-2 text-sm"
                onClick={() => goWorkspace(validLast)}
              >
                Open workspace
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="rounded border p-4">
              <div className="text-sm text-gray-600 mb-1">Quick actions</div>
              <div className="flex flex-col gap-2">
                <button className="rounded bg-gray-900 text-white px-3 py-2 text-sm" onClick={() => nav("/workspaces/new")}>
                  Create workspace
                </button>
                <button className="rounded bg-gray-100 px-3 py-2 text-sm" onClick={() => nav("/templates")}>
                  Template center
                </button>
              </div>
            </div>
          )}

          {isMemberLike && !isAdmin && (
            <div className="rounded border p-4">
              <div className="text-sm text-gray-600 mb-1">Quick actions</div>
              <div className="flex flex-col gap-2">
                <button className="rounded bg-gray-900 text-white px-3 py-2 text-sm" onClick={() => nav("/templates")}>
                  Template center
                </button>
              </div>
            </div>
          )}

          {isGuest && (
            <div className="rounded border p-4">
              <div className="text-sm text-gray-600 mb-1">Access</div>
              <div className="text-sm">Read-only. Shared workspaces appear here.</div>
            </div>
          )}
        </div>

        {validRecent.length > 0 && (
          <div className="rounded border p-4">
            <div className="font-medium mb-3">Recent workspaces</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {validRecent.map((w) => (
                <button
                  key={w.id}
                  className="text-left rounded border px-4 py-3 hover:bg-gray-50"
                  onClick={() => goWorkspace(w)}
                >
                  <div className="font-medium">{w.name}</div>
                  <div className="text-sm text-gray-600">Open</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border p-4">
          <div className="font-medium mb-3">All workspaces</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workspaces.map((w) => (
              <button
                key={w.id}
                className="text-left rounded border px-4 py-3 hover:bg-gray-50"
                onClick={() => goWorkspace(w)}
              >
                <div className="font-medium">{w.name}</div>
                <div className="text-sm text-gray-600">Open</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
