import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/state/AuthContext';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
  type Favorite,
  type FavoriteItemType,
} from './api';

const FAVORITES_KEY = ['favorites'] as const;

export function useFavorites() {
  const { user } = useAuth();

  return useQuery<Favorite[]>({
    queryKey: FAVORITES_KEY,
    queryFn: listFavorites,
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemType, itemId }: { itemType: FavoriteItemType; itemId: string }) =>
      addFavorite(itemType, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemType, itemId }: { itemType: FavoriteItemType; itemId: string }) =>
      removeFavorite(itemType, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}
