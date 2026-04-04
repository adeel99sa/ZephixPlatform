import { request } from '@/lib/api';

export type FavoriteItemType = 'workspace' | 'project' | 'dashboard';

export interface Favorite {
  id: string;
  userId: string;
  organizationId: string;
  itemType: FavoriteItemType;
  itemId: string;
  displayOrder: number;
  createdAt: string;
}

export async function listFavorites(): Promise<Favorite[]> {
  const data = await request.get<{ favorites: Favorite[] }>('/favorites');
  return data.favorites;
}

export async function addFavorite(
  itemType: FavoriteItemType,
  itemId: string,
): Promise<Favorite> {
  const data = await request.post<{ favorite: Favorite }>('/favorites', {
    itemType,
    itemId,
  });
  return data.favorite;
}

export async function removeFavorite(
  itemType: FavoriteItemType,
  itemId: string,
): Promise<void> {
  await request.delete(`/favorites?itemType=${itemType}&itemId=${itemId}`);
}
