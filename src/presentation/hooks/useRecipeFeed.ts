import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GetRecipeFeed } from '../../application/use-cases/GetRecipeFeed';
import type { Recipe } from '../../domain/entities/Recipe';
import type { RecipeFilters } from '../../domain/repositories/RecipeRepository';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';
import { seededShuffle } from '../../shared/utils/seededShuffle';

const PAGE_SIZE = 6;

function makeShuffleSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

type Status = 'idle' | 'loading' | 'loadingMore' | 'error';

type FeedParams = {
  userId: string | undefined;
  preferences: UserPreferences | null;
  filters: RecipeFilters;
  pantryIngredientNames: string[];
  matchPantryIngredients: boolean;
  shoppingListIngredientNames: string[];
  shoppingListFilterActive: boolean;
};

export function useRecipeFeed({
  userId,
  preferences,
  filters,
  pantryIngredientNames,
  matchPantryIngredients,
  shoppingListIngredientNames,
  shoppingListFilterActive,
}: FeedParams) {
  const useCase = useMemo(
    () => new GetRecipeFeed(new SupabaseRecipeRepository()),
    [],
  );

  const sanitizedFilters = useMemo(() => {
    const next: RecipeFilters = {};
    if (filters.diet) {
      next.diet = filters.diet;
    }
    if (typeof filters.maxCookTimeMinutes === 'number') {
      next.maxCookTimeMinutes = filters.maxCookTimeMinutes;
    }
    if (filters.difficulty) {
      next.difficulty = filters.difficulty;
    }
    return next;
  }, [filters]);

  const queryIdentity = useMemo(
    () =>
      JSON.stringify({
        filters: sanitizedFilters,
        pantryIngredientNames,
        matchPantryIngredients,
        shoppingListIngredientNames,
        shoppingListFilterActive,
        allergies: preferences?.allergies ?? [],
        prefs: preferences?.preferences ?? [],
        dietPref: preferences?.diet ?? null,
      }),
    [
      matchPantryIngredients,
      pantryIngredientNames,
      preferences,
      sanitizedFilters,
      shoppingListFilterActive,
      shoppingListIngredientNames,
    ],
  );

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shuffleSeedRef = useRef(makeShuffleSeed());

  const preferenceBundle: UserPreferences = useMemo(
    () =>
      preferences ?? {
        diet: 'balanced',
        allergies: [],
        preferences: [],
      },
    [preferences],
  );

  const load = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      if (!userId) {
        return;
      }

      setErrorMessage(null);
      setStatus(nextPage === 0 ? 'loading' : 'loadingMore');

      try {
        const batchRaw = await useCase.execute({
          userId,
          pantryIngredientNames,
          matchPantryIngredients,
          shoppingListIngredientNames,
          shoppingListFilterActive,
          preferences: preferenceBundle,
          filters:
            Object.keys(sanitizedFilters).length > 0 ? sanitizedFilters : undefined,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        const batch =
          mode === 'replace' ? seededShuffle(batchRaw, shuffleSeedRef.current) : batchRaw;

        setHasMore(batchRaw.length === PAGE_SIZE);
        setPage(nextPage);

        setRecipes((prev) => {
          if (mode === 'replace') {
            return batch;
          }
          const existing = new Set(prev.map((item) => item.id));
          const merged = batch.filter((item) => !existing.has(item.id));
          return [...prev, ...merged];
        });
        setStatus('idle');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudieron cargar las recetas.';
        setErrorMessage(message);
        setStatus('error');
      }
    },
    [
      matchPantryIngredients,
      pantryIngredientNames,
      preferenceBundle,
      sanitizedFilters,
      shoppingListFilterActive,
      shoppingListIngredientNames,
      useCase,
      userId,
    ],
  );

  useEffect(() => {
    if (!userId) {
      return;
    }
    shuffleSeedRef.current = makeShuffleSeed();
    setPage(0);
    setHasMore(true);
    void load(0, 'replace');
  }, [load, queryIdentity, userId]);

  const refresh = useCallback(() => {
    shuffleSeedRef.current = makeShuffleSeed();
    setHasMore(true);
    void load(0, 'replace');
  }, [load]);

  const loadMore = useCallback(() => {
    if (!userId || status === 'loading' || status === 'loadingMore' || !hasMore) {
      return;
    }
    void load(page + 1, 'append');
  }, [hasMore, load, page, status, userId]);

  return {
    recipes,
    status,
    errorMessage,
    refresh,
    loadMore,
    hasMore,
  };
}
