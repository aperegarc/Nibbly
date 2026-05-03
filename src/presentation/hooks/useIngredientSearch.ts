import { useEffect, useState } from 'react';

import { searchIngredientNames } from '../../infrastructure/supabase/ingredientSearch';

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

export function useIngredientSearch(query: string, enabled: boolean): string[] {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      return;
    }

    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      return;
    }

    let active = true;
    const handle = setTimeout(() => {
      void searchIngredientNames(q).then((names) => {
        if (active) {
          setResults(names);
        }
      });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, enabled]);

  return results;
}
