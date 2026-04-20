import { request, unwrapApiData } from '@/lib/api';

export type FavoriteItemType = 'workspace' | 'project' | 'dashboard';

export interface Favorite {
  id: string;
  userId: string;
  organizationId: string;
  itemType: FavoriteItemType;
  itemId: string;
  displayName: string;
  displayOrder: number;
  createdAt: string;
}

export async function listFavorites(): Promise<Favorite[]> {
  const raw = await request.get<unknown>('/favorites');
  const data = unwrapApiData<{ favorites?: Favorite[] }>(raw);
  return Array.isArray(data?.favorites) ? data.favorites : [];
}

export async function addFavorite(
  itemType: FavoriteItemType,
  itemId: string,
): Promise<Favorite> {
  const raw = await request.post<unknown>('/favorites', {
    itemType,
    itemId,
  });
  const data = unwrapApiData<{ favorite?: Favorite }>(raw);
  if (!data?.favorite) {
    throw new Error('Add favorite returned no favorite');
  }
  return data.favorite;
}

export async function removeFavorite(
  itemType: FavoriteItemType,
  itemId: string,
): Promise<void> {
  await request.delete(`/favorites?itemType=${itemType}&itemId=${itemId}`);
}
