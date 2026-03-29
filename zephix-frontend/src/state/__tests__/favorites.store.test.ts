import { beforeEach, describe, expect, it } from 'vitest';
import { getFavoriteKey, useFavoritesStore } from '../favorites.store';

describe('favorites.store composite identity', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({ items: [] });
  });

  it('does not collide when different entity types share same id', () => {
    const store = useFavoritesStore.getState();

    store.addFavorite({ type: 'workspace', id: '123', name: 'Workspace 123' });
    store.addFavorite({
      type: 'project',
      id: '123',
      name: 'Project 123',
      workspaceId: 'ws-a',
    });

    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.key)).toContain(getFavoriteKey({ type: 'workspace', id: '123' }));
    expect(items.map((item) => item.key)).toContain(
      getFavoriteKey({ type: 'project', id: '123', workspaceId: 'ws-a' }),
    );
  });

  it('removes only the targeted composite favorite in mixed sets', () => {
    const store = useFavoritesStore.getState();

    store.addFavorite({
      type: 'project',
      id: '123',
      workspaceId: 'ws-a',
      name: 'Project A',
    });
    store.addFavorite({
      type: 'project',
      id: '123',
      workspaceId: 'ws-b',
      name: 'Project B',
    });

    store.removeFavorite({ type: 'project', id: '123', workspaceId: 'ws-a' });

    const items = useFavoritesStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].workspaceId).toBe('ws-b');
  });
});
