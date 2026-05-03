import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import type { Recipe } from '../../domain/entities/Recipe';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';

export function useFavoriteRecipes(userId: string | undefined, preferences: UserPreferences | null) {
  const repository = useMemo(() => new SupabaseRecipeRepository(), []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !preferences) {
      setRecipes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await repository.listFavoriteRecipes({ userId, preferences });
      setRecipes(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los favoritos.');
    } finally {
      setLoading(false);
    }
  }, [preferences, repository, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { recipes, loading, error, refresh: load };
}
