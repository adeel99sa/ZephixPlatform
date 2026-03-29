import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FavoriteItem = {
  key?: string;
  type: 'workspace' | 'portfolio' | 'program' | 'project' | 'route';
  id: string;
  name: string;
  route?: string;
  workspaceId?: string;
};

export function getFavoriteKey(item: Pick<FavoriteItem, 'type' | 'id' | 'workspaceId'>): string {
  const scope = item.workspaceId && item.workspaceId.trim().length > 0 ? item.workspaceId : 'global';
  return `${item.type}:${scope}:${item.id}`;
}

interface FavoritesState {
  items: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (item: Pick<FavoriteItem, 'type' | 'id' | 'workspaceId'>) => void;
  isFavorite: (item: Pick<FavoriteItem, 'type' | 'id' | 'workspaceId'>) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      addFavorite: (item) =>
        set((state) => {
          const key = getFavoriteKey(item);
          if (state.items.some((f) => (f.key || getFavoriteKey(f)) === key)) return state;
          return { items: [...state.items, { ...item, key }] };
        }),
      removeFavorite: (item) => {
        const key = getFavoriteKey(item);
        set((state) => ({
          items: state.items.filter((f) => (f.key || getFavoriteKey(f)) !== key),
        }));
      },
      isFavorite: (item) => {
        const key = getFavoriteKey(item);
        return get().items.some((f) => (f.key || getFavoriteKey(f)) === key);
      },
    }),
    {
      name: 'zephix-favorites-v1',
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as { items?: FavoriteItem[] } | undefined;
        if (!state || !Array.isArray(state.items)) {
          return { items: [] };
        }
        const normalized = state.items
          .filter(
            (item): item is FavoriteItem =>
              Boolean(
                item &&
                  typeof item === 'object' &&
                  typeof item.id === 'string' &&
                  typeof item.type === 'string',
              ),
          )
          .map((item) => ({ ...item, key: getFavoriteKey(item) }));
        return { items: normalized };
      },
    },
  ),
);
