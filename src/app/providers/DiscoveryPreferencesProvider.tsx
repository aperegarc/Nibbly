import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { DietType } from '../../domain/entities/Recipe';
import type { RecipeFilters } from '../../domain/repositories/RecipeRepository';
import { LIMITS } from '../../shared/utils/limits';
import { sanitizeUserTag } from '../../shared/utils/sanitize';

type DiscoverySeed = {
  diet?: DietType;
};

type DiscoveryPreferencesContextValue = {
  ingredientTags: string[];
  addIngredientTag: (raw: string) => void;
  removeIngredientTag: (tag: string) => void;
  clearIngredientTags: () => void;
  filters: RecipeFilters;
  setFilters: (next: RecipeFilters) => void;
  /**
   * Si es true, el feed exige que la receta use al menos uno de los ingredientes de "en casa".
   * Si es false, se ignoran esas etiquetas en la búsqueda (sigue valiendo dieta/tiempo y lista de compra si está activa).
   */
  matchPantryIngredients: boolean;
  setMatchPantryIngredients: (value: boolean) => void;
};

const DiscoveryPreferencesContext = createContext<DiscoveryPreferencesContextValue | null>(null);

export function DiscoveryPreferencesProvider({
  children,
  seed,
}: {
  children: ReactNode;
  seed: DiscoverySeed;
}) {
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);
  const [filters, setFiltersState] = useState<RecipeFilters>(() =>
    seed.diet ? { diet: seed.diet } : {},
  );
  const [matchPantryIngredients, setMatchPantryIngredients] = useState(true);

  const setFilters = useCallback((next: RecipeFilters) => {
    setFiltersState(next);
  }, []);

  const addIngredientTag = useCallback((raw: string) => {
    const value = sanitizeUserTag(raw, LIMITS.discoveryTagMaxLength);
    if (!value) {
      return;
    }

    setIngredientTags((prev) => {
      if (prev.length >= LIMITS.discoveryTagMaxCount) {
        return prev;
      }
      const lower = value.toLowerCase();
      if (prev.some((item) => item.toLowerCase() === lower)) {
        return prev;
      }
      return [...prev, value];
    });
  }, []);

  const removeIngredientTag = useCallback((tag: string) => {
    setIngredientTags((prev) => prev.filter((item) => item !== tag));
  }, []);

  const clearIngredientTags = useCallback(() => {
    setIngredientTags([]);
  }, []);

  const value = useMemo(
    () => ({
      ingredientTags,
      addIngredientTag,
      removeIngredientTag,
      clearIngredientTags,
      filters,
      setFilters,
      matchPantryIngredients,
      setMatchPantryIngredients,
    }),
    [
      ingredientTags,
      addIngredientTag,
      removeIngredientTag,
      clearIngredientTags,
      filters,
      matchPantryIngredients,
      setFilters,
    ],
  );

  return (
    <DiscoveryPreferencesContext.Provider value={value}>
      {children}
    </DiscoveryPreferencesContext.Provider>
  );
}

export function useDiscoveryPreferences(): DiscoveryPreferencesContextValue {
  const context = useContext(DiscoveryPreferencesContext);
  if (!context) {
    throw new Error('useDiscoveryPreferences debe usarse dentro de DiscoveryPreferencesProvider.');
  }
  return context;
}
