import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FavoritesSortMode = "saved" | "alpha";

export type FavoriteFolder = {
  id: string;
  name: string;
};

type LayoutState = {
  sortMode: FavoritesSortMode;
  folders: FavoriteFolder[];
  /** favorite row id (API favorite.id) → folder id, or unset = root */
  favoriteFolderIdByFavoriteId: Record<string, string>;
  setSortMode: (mode: FavoritesSortMode) => void;
  addFolder: (name: string) => string;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  assignFavoriteToFolder: (favoriteId: string, folderId: string | null) => void;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useFavoritesLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      sortMode: "saved",
      folders: [],
      favoriteFolderIdByFavoriteId: {},
      setSortMode: (mode) => set({ sortMode: mode }),
      addFolder: (name) => {
        const trimmed = name.trim() || "New folder";
        const id = randomId();
        set((s) => ({ folders: [...s.folders, { id, name: trimmed }] }));
        return id;
      },
      renameFolder: (folderId, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          folders: s.folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)),
        }));
      },
      deleteFolder: (folderId) => {
        set((s) => {
          const map = { ...s.favoriteFolderIdByFavoriteId };
          for (const [fid, fld] of Object.entries(map)) {
            if (fld === folderId) delete map[fid];
          }
          return {
            folders: s.folders.filter((f) => f.id !== folderId),
            favoriteFolderIdByFavoriteId: map,
          };
        });
      },
      assignFavoriteToFolder: (favoriteId, folderId) => {
        set((s) => {
          const map = { ...s.favoriteFolderIdByFavoriteId };
          if (folderId == null) {
            delete map[favoriteId];
          } else {
            map[favoriteId] = folderId;
          }
          return { favoriteFolderIdByFavoriteId: map };
        });
      },
    }),
    {
      name: "zephix-favorites-layout-v1",
      partialize: (s) => ({
        sortMode: s.sortMode,
        folders: s.folders,
        favoriteFolderIdByFavoriteId: s.favoriteFolderIdByFavoriteId,
      }),
    },
  ),
);
