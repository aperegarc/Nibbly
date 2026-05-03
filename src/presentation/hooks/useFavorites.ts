import { useCallback, useEffect, useMemo, useState } from 'react';

import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';
import { getSupabaseClient } from '../../infrastructure/supabase/client';

export function useFavorites(userId: string | undefined) {
  const repository = useMemo(() => new SupabaseRecipeRepository(), []);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Favoritos', error);
      setLoading(false);
      return;
    }

    setFavoriteIds(new Set(data?.map((row) => row.recipe_id) ?? []));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isFavorite = useCallback((recipeId: string) => favoriteIds.has(recipeId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (!userId) {
        return;
      }

      const next = new Set(favoriteIds);
      const shouldRemove = next.has(recipeId);

      if (shouldRemove) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      setFavoriteIds(next);

      try {
        if (shouldRemove) {
          await repository.removeFavorite(userId, recipeId);
        } else {
          await repository.saveFavorite(userId, recipeId);
        }
      } catch (error) {
        console.error('Error al actualizar favorito', error);
        void refresh();
      }
    },
    [favoriteIds, refresh, repository, userId],
  );

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    refreshFavorites: refresh,
    favoritesLoading: loading,
  };
}
