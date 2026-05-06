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

type DiscoverySeed = {
  diet?: DietType;
};

type DiscoveryPreferencesContextValue = {
  filters: RecipeFilters;
  setFilters: (next: RecipeFilters) => void;
};

const DiscoveryPreferencesContext = createContext<DiscoveryPreferencesContextValue | null>(null);

export function DiscoveryPreferencesProvider({
  children,
  seed,
}: {
  children: ReactNode;
  seed: DiscoverySeed;
}) {
  const [filters, setFiltersState] = useState<RecipeFilters>(() =>
    seed.diet ? { diet: seed.diet } : {},
  );

  const setFilters = useCallback((next: RecipeFilters) => {
    setFiltersState(next);
  }, []);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
    }),
    [filters, setFilters],
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
