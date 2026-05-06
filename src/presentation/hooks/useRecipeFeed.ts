import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GetRecipeFeed } from '../../application/use-cases/GetRecipeFeed';
import type { Recipe } from '../../domain/entities/Recipe';
import type { RecipeFilters } from '../../domain/repositories/RecipeRepository';
import type { UserPreferences } from '../../domain/entities/UserPreferences';
import { SupabaseRecipeRepository } from '../../infrastructure/repositories/SupabaseRecipeRepository';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
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
  shoppingListIngredientNames: string[];
  shoppingListFilterActive: boolean;
};

type UserSignals = {
  viewedCounts: Map<string, number>;
  startedCookingCounts: Map<string, number>;
  cookedCounts: Map<string, number>;
  cookedHardCounts: Map<string, number>;
  tookLongerCounts: Map<string, number>;
};

function emptySignals(): UserSignals {
  return {
    viewedCounts: new Map(),
    startedCookingCounts: new Map(),
    cookedCounts: new Map(),
    cookedHardCounts: new Map(),
    tookLongerCounts: new Map(),
  };
}

function bump(map: Map<string, number>, recipeId: string) {
  map.set(recipeId, (map.get(recipeId) ?? 0) + 1);
}

function deterministicJitter(recipeId: string, seed: number): number {
  let h = seed ^ 0x9e3779b9;
  for (let i = 0; i < recipeId.length; i += 1) {
    h = (h * 33) ^ recipeId.charCodeAt(i);
  }
  const n = Math.abs(h % 1000);
  return n / 1000;
}

function scoreRecipe(recipe: Recipe, signals: UserSignals, seed: number): number {
  const id = recipe.id;
  const viewed = signals.viewedCounts.get(id) ?? 0;
  const started = signals.startedCookingCounts.get(id) ?? 0;
  const cooked = signals.cookedCounts.get(id) ?? 0;
  const hard = signals.cookedHardCounts.get(id) ?? 0;
  const tookLonger = signals.tookLongerCounts.get(id) ?? 0;

  let score = 0;
  score += Math.min(2, viewed * 0.2);
  score += Math.min(2.5, started * 0.8);
  // Ya cocinada: bajar mucho la prioridad para sugerir platos nuevos (antes sumábamos cooked/cooked_easy).
  if (cooked > 0) {
    score -= 16 + Math.min(6, (cooked - 1) * 2);
  }
  score -= Math.min(3.5, hard * 1.7);
  score -= Math.min(2, tookLonger * 0.9);

  if (recipe.cookTimeMinutes <= 20) score += 0.8;
  else if (recipe.cookTimeMinutes <= 35) score += 0.35;

  score += deterministicJitter(id, seed) * 0.35;
  return score;
}

function sortBatchForFeed(
  batch: Recipe[],
  userSignals: UserSignals,
  seed: number,
): Recipe[] {
  const base = batch.slice();
  return base.sort(
    (a, b) =>
      scoreRecipe(b, userSignals, seed) - scoreRecipe(a, userSignals, seed),
  );
}

async function fetchUserSignals(userId: string): Promise<UserSignals> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('recipe_events')
    .select('recipe_id,event_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error || !data) {
    return emptySignals();
  }

  const out = emptySignals();
  for (const row of data) {
    const recipeId = row.recipe_id;
    const eventType = row.event_type;
    if (!recipeId || !eventType) continue;
    if (eventType === 'viewed') bump(out.viewedCounts, recipeId);
    else if (eventType === 'started_cooking') bump(out.startedCookingCounts, recipeId);
    else if (eventType === 'cooked') bump(out.cookedCounts, recipeId);
    else if (eventType === 'cooked_hard') bump(out.cookedHardCounts, recipeId);
    else if (eventType === 'took_longer') bump(out.tookLongerCounts, recipeId);
  }
  return out;
}

export function useRecipeFeed({
  userId,
  preferences,
  filters,
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
        shoppingListIngredientNames,
        shoppingListFilterActive,
        allergies: preferences?.allergies ?? [],
        prefs: preferences?.preferences ?? [],
        dietPref: preferences?.diet ?? null,
      }),
    [preferences, sanitizedFilters, shoppingListFilterActive, shoppingListIngredientNames],
  );

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shuffleSeedRef = useRef(makeShuffleSeed());
  const lastUserIdRef = useRef<string | undefined>(undefined);

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
        const userSignals = await fetchUserSignals(userId);
        const batchRaw = await useCase.execute({
          userId,
          shoppingListIngredientNames,
          shoppingListFilterActive,
          preferences: preferenceBundle,
          filters:
            Object.keys(sanitizedFilters).length > 0 ? sanitizedFilters : undefined,
          page: nextPage,
          pageSize: PAGE_SIZE,
        });

        const shuffled =
          mode === 'replace'
            ? seededShuffle(batchRaw, shuffleSeedRef.current)
            : batchRaw;
        const batch = sortBatchForFeed(shuffled, userSignals, shuffleSeedRef.current);

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
    [preferenceBundle, sanitizedFilters, shoppingListFilterActive, shoppingListIngredientNames, useCase, userId],
  );

  useEffect(() => {
    if (!userId) {
      lastUserIdRef.current = undefined;
      return;
    }
    // Nuevo login/sesión: nuevo orden aleatorio base del feed.
    if (lastUserIdRef.current !== userId) {
      shuffleSeedRef.current = makeShuffleSeed();
      lastUserIdRef.current = userId;
    }
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
