import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/AuthContext";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/state/workspace.store";

type WorkspaceListItem = {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  membersCount?: number;
};

type StoredWorkspaceRef = {
  id: string;
  slug?: string;
  name?: string;
  ts: number;
};

const LAST_KEY = "zephix_last_workspace_v1";
const RECENT_KEY = "zephix_recent_workspaces_v1";

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWriteJson(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

function toHomeUrl(w: WorkspaceListItem) {
  const slug = w.slug;
  if (slug) return `/w/${slug}/home`;
  return `/workspaces/${w.id}/home`;
}

export default function GlobalHomePage() {
  const { user, isLoading } = useAuth();
  const nav = useNavigate();
  const setActiveWorkspaceId = useWorkspaceStore((s: any) => s.setActiveWorkspaceId);

  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaned, setCleaned] = useState(false);

  const role = (user?.platformRole || "MEMBER") as "ADMIN" | "MEMBER" | "VIEWER";
  const isGuest = role === "VIEWER";

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    load();
  }, [isLoading, user?.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/workspaces");
      const list = (res as any)?.items ?? (res as any)?.data ?? res;
      const ws = Array.isArray(list) ? list : [];
      setWorkspaces(ws);

      const last = safeReadJson<StoredWorkspaceRef>(LAST_KEY);
      const recent = safeReadJson<StoredWorkspaceRef[]>(RECENT_KEY) || [];

      const byId = new Map(ws.map((w: WorkspaceListItem) => [w.id, w]));

      let changed = false;

      let validLast: StoredWorkspaceRef | null = null;
      if (last && byId.has(last.id)) {
        const w = byId.get(last.id)!;
        validLast = { id: w.id, slug: w.slug, name: w.name, ts: last.ts || Date.now() };
        if (last.slug !== w.slug || last.name !== w.name) changed = true;
      } else if (last) {
        safeRemove(LAST_KEY);
        changed = true;
      }

      const validRecent = (recent || [])
        .filter((r) => r && typeof r.id === "string" && byId.has(r.id))
        .map((r) => {
          const w = byId.get(r.id)!;
          return { id: w.id, slug: w.slug, name: w.name, ts: r.ts || Date.now() };
        })
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 8);

      if ((recent || []).length !== validRecent.length) changed = true;

      if (validLast) safeWriteJson(LAST_KEY, validLast);
      safeWriteJson(RECENT_KEY, validRecent);

      if (changed) setCleaned(true);
    } finally {
      setLoading(false);
    }
  }

  const lastWorkspace = useMemo(() => safeReadJson<StoredWorkspaceRef>(LAST_KEY), [workspaces.length]);
  const recentWorkspaces = useMemo(() => safeReadJson<StoredWorkspaceRef[]>(RECENT_KEY) || [], [workspaces.length]);

  function openWorkspace(w: WorkspaceListItem) {
    setActiveWorkspaceId(w.id);
    safeWriteJson(LAST_KEY, { id: w.id, slug: w.slug, name: w.name, ts: Date.now() });
    const nextRecent = [{ id: w.id, slug: w.slug, name: w.name, ts: Date.now() }, ...recentWorkspaces.filter((r) => r.id !== w.id)].slice(0, 8);
    safeWriteJson(RECENT_KEY, nextRecent);
    nav(toHomeUrl(w));
  }

  function continueLast() {
    if (!lastWorkspace) return;
    const w = workspaces.find((x) => x.id === lastWorkspace.id);
    if (!w) return;
    openWorkspace(w);
  }

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!user) {
    nav("/login");
    return null;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  const hasWorkspaces = workspaces.length > 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Home</div>
          <div style={{ marginTop: 6, color: "#666" }}>
            {isGuest ? "Read only access" : "Pick up your work"}
            {cleaned ? <span style={{ marginLeft: 10, color: "#999" }}>Updated unavailable workspaces</span> : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {role === "ADMIN" ? (
            <>
              <button onClick={() => nav("/workspaces/new")} style={btnPrimary}>Create workspace</button>
              <button onClick={() => nav("/templates")} style={btn}>Template center</button>
              <button onClick={() => nav("/projects/new")} style={btn}>Create project</button>
            </>
          ) : null}

          {role === "MEMBER" ? (
            <>
              <button onClick={() => nav("/templates")} style={btnPrimary}>Template center</button>
              <button onClick={() => nav("/projects/new")} style={btn}>Create project</button>
            </>
          ) : null}

          {isGuest ? (
            <button onClick={() => nav("/workspaces")} style={btnPrimary}>View workspaces</button>
          ) : null}
        </div>
      </div>

      {!hasWorkspaces ? (
        <div style={card}>
          {role === "ADMIN" ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Set up your first workspace</div>
              <div style={{ color: "#666", marginTop: 8 }}>Create a workspace, then start a project from a template.</div>
              <div style={{ marginTop: 12 }}>
                <button onClick={() => nav("/workspaces/new")} style={btnPrimary}>Create workspace</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 16 }}>No workspace access</div>
              <div style={{ color: "#666", marginTop: 8 }}>Ask an admin to invite you to a workspace.</div>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
            <div style={card}>
              <div style={{ fontWeight: 700 }}>Continue</div>
              <div style={{ color: "#666", marginTop: 8 }}>
                {lastWorkspace ? `Last workspace: ${lastWorkspace.name || "Workspace"}` : "No recent workspace yet"}
              </div>
              <div style={{ marginTop: 12 }}>
                <button disabled={!lastWorkspace} onClick={continueLast} style={!lastWorkspace ? btnDisabled : btnPrimary}>
                  Continue
                </button>
              </div>
            </div>

            <div style={card}>
              <div style={{ fontWeight: 700 }}>Recent</div>
              <div style={{ color: "#666", marginTop: 8 }}>Your last visited workspaces</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {recentWorkspaces.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      const w = workspaces.find((x) => x.id === r.id);
                      if (w) openWorkspace(w);
                    }}
                    style={pill}
                  >
                    {r.name || "Workspace"}
                  </button>
                ))}
                {recentWorkspaces.length === 0 ? <div style={{ color: "#999" }}>None yet</div> : null}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Workspaces</div>
                <div style={{ color: "#666", marginTop: 6 }}>Select one to open the dashboard</div>
              </div>
              <button onClick={() => nav("/workspaces")} style={btn}>Manage</button>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {workspaces.slice(0, 9).map((w) => (
                <div key={w.id} style={tile} onClick={() => openWorkspace(w)} role="button" tabIndex={0}>
                  <div style={{ fontWeight: 700 }}>{w.name}</div>
                  <div style={{ color: "#666", marginTop: 6, fontSize: 13 }}>
                    {w.description ? w.description : "Workspace"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #4f46e5",
  background: "#4f46e5",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const btnDisabled: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #eee",
  background: "#f5f5f5",
  color: "#aaa",
  cursor: "not-allowed",
  fontWeight: 700,
};

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 16,
  background: "#fff",
};

const tile: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
  cursor: "pointer",
};

const pill: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #eee",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
