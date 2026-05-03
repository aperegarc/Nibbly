import { useEffect, useMemo, useState } from 'react';

import type { Recipe } from '../../domain/entities/Recipe';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';

const DEBOUNCE_MS = 280;

export function useRecipeTitleSearch(query: string, enabled: boolean, preferences: UserPreferences) {
  const repository = useMemo(() => new SupabaseRecipeRepository(), []);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const handle = setTimeout(() => {
      void repository
        .searchPublishedByTitle({ titleQuery: q, preferences, limit: 24 })
        .then((list) => {
          if (active) {
            setRecipes(list);
          }
        })
        .catch(() => {
          if (active) {
            setRecipes([]);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [enabled, preferences, query, repository]);

  return { recipes, loading };
}
