import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FavoriteItemType } from "@/features/favorites/api";

const UUID_SRC = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RE_WS_HOME = new RegExp(`^/workspaces/(${UUID_SRC})/home$`, "i");
const RE_WS_ONLY = new RegExp(`^/workspaces/(${UUID_SRC})$`, "i");
const RE_PROJECT = new RegExp(`^/projects/(${UUID_SRC})`, "i");
const RE_DASHBOARD = new RegExp(`^/dashboards/(${UUID_SRC})$`, "i");

export type NavigationRecentEntry = {
  key: string;
  itemType: FavoriteItemType;
  itemId: string;
  label: string;
  path: string;
  at: number;
};

const MAX = 18;

function fallbackLabel(pathname: string, itemType: FavoriteItemType): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (new RegExp(`^${UUID_SRC}$`, "i").test(last)) {
    return itemType === "workspace"
      ? "Workspace"
      : itemType === "project"
        ? "Project"
        : "Dashboard";
  }
  return last || pathname;
}

/** Best-effort title from document (strip common app suffix). */
export function titleFromDocument(): string {
  const t = document.title?.trim() ?? "";
  if (!t) return "";
  const cut = t.split(/\s*[|—–-]\s*/)[0]?.trim() ?? t;
  return cut || t;
}

/**
 * Parse current path into a favoritable recent entry, or null.
 */
export function parseFavoritableRecent(pathname: string): Omit<NavigationRecentEntry, "at" | "key" | "label"> & { label?: string } | null {
  const p = pathname.replace(/\/+$/, "") || "/";

  if (p === "/inbox" || p === "/home" || p.startsWith("/settings") || p.startsWith("/onboarding")) {
    return null;
  }

  let m = p.match(RE_WS_HOME) || p.match(RE_WS_ONLY);
  if (m) {
    return { itemType: "workspace", itemId: m[1], path: p };
  }

  m = p.match(RE_PROJECT);
  if (m) {
    return { itemType: "project", itemId: m[1], path: p };
  }

  m = p.match(RE_DASHBOARD);
  if (m) {
    return { itemType: "dashboard", itemId: m[1], path: p };
  }

  return null;
}

type RecentsState = {
  entries: NavigationRecentEntry[];
  recordVisit: (pathname: string, labelHint?: string) => void;
  clear: () => void;
};

export const useNavigationRecentsStore = create<RecentsState>()(
  persist(
    (set, get) => ({
      entries: [],
      recordVisit: (pathname: string, labelHint?: string) => {
        const base = parseFavoritableRecent(pathname);
        if (!base) return;
        const key = `${base.itemType}:${base.itemId}`;
        const label = (labelHint && labelHint.trim()) || titleFromDocument() || fallbackLabel(base.path, base.itemType);
        const entry: NavigationRecentEntry = {
          key,
          itemType: base.itemType,
          itemId: base.itemId,
          label,
          path: base.path,
          at: Date.now(),
        };
        const rest = get().entries.filter((e) => e.key !== key);
        const next = [entry, ...rest].slice(0, MAX);
        set({ entries: next });
      },
      clear: () => set({ entries: [] }),
    }),
    { name: "zephix-nav-recents-v1" },
  ),
);
