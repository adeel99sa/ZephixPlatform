import { useEffect } from "react";

type Ref = { id: string; slug: string; name: string; ts: number };

const LAST_KEY = "zephix_last_workspace_v1";
const RECENT_KEY = "zephix_recent_workspaces_v1";
const RECENT_MAX = 6;

function readList(): Ref[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Ref[];
  } catch {
    return [];
  }
}

function writeList(list: Ref[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
  }
}

function writeLast(ref: Ref) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(ref));
  } catch {
  }
}

export function useWorkspaceVisitTracker(workspace: { id: string; slug: string; name: string } | null) {
  useEffect(() => {
    if (!workspace) return;

    const ref: Ref = {
      id: workspace.id,
      slug: workspace.slug,
      name: workspace.name,
      ts: Date.now(),
    };

    writeLast(ref);

    const list = readList();
    const dedup = [ref, ...list.filter((x) => x.id !== ref.id)];
    writeList(dedup.slice(0, RECENT_MAX));
  }, [workspace?.id, workspace?.slug, workspace?.name]);
}
