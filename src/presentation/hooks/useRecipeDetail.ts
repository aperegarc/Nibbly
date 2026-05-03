import { useEffect, useMemo, useState } from 'react';

import type { Recipe } from '../../domain/entities/Recipe';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';

export function useRecipeDetail(recipeId: string | undefined, preferences: UserPreferences | null) {
  const repository = useMemo(() => new SupabaseRecipeRepository(), []);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId || !preferences) {
      setRecipe(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void repository
      .getById({ recipeId, preferences })
      .then((r) => {
        if (!cancelled) {
          setRecipe(r);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar la receta.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [preferences, recipeId, repository]);

  return { recipe, loading, error };
}
