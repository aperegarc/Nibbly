import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ShoppingListItem } from '../../domain/entities/ShoppingListItem';
import { SupabaseShoppingListRepository } from '../../infrastructure/repositories/SupabaseShoppingListRepository';
import { isMissingShoppingListTableError } from '../../shared/errors/AppError';
import { useAuth } from './AuthProvider';

const SHOPPING_FEED_FILTER_KEY = (userId: string) => `@recepy/shopping_feed_filter_v1/${userId}`;

type ShoppingListContextValue = {
  items: ShoppingListItem[];
  loading: boolean;
  /** True si falta la tabla en Supabase o el API no expone el esquema aún. */
  listSchemaMissing: boolean;
  /**
   * Si es true, los ítems no tachados de la lista se añaden al filtro por ingredientes del feed.
   * Solo se activa desde la pantalla de lista de la compra (persistido por usuario).
   */
  useShoppingListForFeedFilter: boolean;
  setUseShoppingListForFeedFilter: (value: boolean) => void;
  /** Etiquetas de ítems no tachados. */
  uncheckedLabels: string[];
  refresh: () => Promise<void>;
  addItem: (label: string) => Promise<void>;
  addItems: (labels: string[]) => Promise<void>;
  setItemChecked: (itemId: string, checked: boolean) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
  clearAllItems: () => Promise<void>;
};

const ShoppingListContext = createContext<ShoppingListContextValue | null>(null);

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const repository = useMemo(() => new SupabaseShoppingListRepository(), []);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listSchemaMissing, setListSchemaMissing] = useState(false);
  const [useShoppingListForFeedFilter, setUseShoppingListForFeedFilterState] = useState(false);
  const skipShoppingFetchRef = useRef(false);
  const warnedMissingTableRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      skipShoppingFetchRef.current = false;
      setListSchemaMissing(false);
      setUseShoppingListForFeedFilterState(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHOPPING_FEED_FILTER_KEY(userId));
        if (!cancelled) {
          setUseShoppingListForFeedFilterState(raw === '1');
        }
      } catch {
        if (!cancelled) {
          setUseShoppingListForFeedFilterState(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setUseShoppingListForFeedFilter = useCallback(
    (value: boolean) => {
      setUseShoppingListForFeedFilterState(value);
      if (userId) {
        void AsyncStorage.setItem(SHOPPING_FEED_FILTER_KEY(userId), value ? '1' : '0');
      }
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setListSchemaMissing(false);
      return;
    }
    skipShoppingFetchRef.current = false;
    setLoading(true);
    try {
      const next = await repository.listByUser(userId);
      setItems(next);
      setListSchemaMissing(false);
    } catch (e) {
      if (isMissingShoppingListTableError(e)) {
        setItems([]);
        setListSchemaMissing(true);
        skipShoppingFetchRef.current = true;
        if (!warnedMissingTableRef.current) {
          warnedMissingTableRef.current = true;
          console.warn(
            '[recepy] La tabla shopping_list_items no existe en Supabase o el API no la ve aún. Ejecuta el SQL de supabase/migrations/20260504100000_full_instructions_shopping_list.sql (Dashboard → SQL), tira hacia abajo aquí para reintentar o reinicia la app.',
          );
        }
      } else {
        console.error('Lista de compra', e);
      }
    } finally {
      setLoading(false);
    }
  }, [repository, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uncheckedLabels = useMemo(
    () =>
      items
        .filter((i) => !i.checked)
        .map((i) => i.label.trim())
        .filter((l) => l.length > 0),
    [items],
  );

  const addItem = useCallback(
    async (label: string) => {
      if (!userId || listSchemaMissing || skipShoppingFetchRef.current) {
        return;
      }
      try {
        const created = await repository.addItem(userId, label);
        setItems((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (e) {
        if (isMissingShoppingListTableError(e)) {
          skipShoppingFetchRef.current = true;
          setListSchemaMissing(true);
        } else {
          throw e;
        }
      }
    },
    [listSchemaMissing, repository, userId],
  );

  const addItems = useCallback(
    async (labels: string[]) => {
      if (!userId || listSchemaMissing || skipShoppingFetchRef.current || labels.length === 0) {
        return;
      }
      try {
        const created = await repository.addItems(userId, labels);
        if (created.length === 0) {
          return;
        }
        setItems((prev) => [...prev, ...created].sort((a, b) => a.sortOrder - b.sortOrder));
      } catch (e) {
        if (isMissingShoppingListTableError(e)) {
          skipShoppingFetchRef.current = true;
          setListSchemaMissing(true);
        } else {
          throw e;
        }
      }
    },
    [listSchemaMissing, repository, userId],
  );

  const setItemChecked = useCallback(
    async (itemId: string, checked: boolean) => {
      if (!userId || listSchemaMissing || skipShoppingFetchRef.current) {
        return;
      }
      try {
        await repository.setChecked(userId, itemId, checked);
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked } : i)));
      } catch (e) {
        if (isMissingShoppingListTableError(e)) {
          skipShoppingFetchRef.current = true;
          setListSchemaMissing(true);
        } else {
          throw e;
        }
      }
    },
    [listSchemaMissing, repository, userId],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!userId || listSchemaMissing || skipShoppingFetchRef.current) {
        return;
      }
      try {
        await repository.removeItem(userId, itemId);
        setItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch (e) {
        if (isMissingShoppingListTableError(e)) {
          skipShoppingFetchRef.current = true;
          setListSchemaMissing(true);
        } else {
          throw e;
        }
      }
    },
    [listSchemaMissing, repository, userId],
  );

  const clearAllItems = useCallback(async () => {
    if (!userId || listSchemaMissing || skipShoppingFetchRef.current) {
      return;
    }
    try {
      await repository.clearByUser(userId);
      setItems([]);
    } catch (e) {
      if (isMissingShoppingListTableError(e)) {
        skipShoppingFetchRef.current = true;
        setListSchemaMissing(true);
      } else {
        throw e;
      }
    }
  }, [listSchemaMissing, repository, userId]);

  const clearCheckedItems = useCallback(async () => {
    if (!userId || listSchemaMissing || skipShoppingFetchRef.current) {
      return;
    }
    try {
      await repository.clearCheckedByUser(userId);
      setItems((prev) => prev.filter((i) => !i.checked));
    } catch (e) {
      if (isMissingShoppingListTableError(e)) {
        skipShoppingFetchRef.current = true;
        setListSchemaMissing(true);
      } else {
        throw e;
      }
    }
  }, [listSchemaMissing, repository, userId]);

  const value = useMemo(
    () => ({
      items,
      loading,
      listSchemaMissing,
      useShoppingListForFeedFilter,
      setUseShoppingListForFeedFilter,
      uncheckedLabels,
      refresh,
      addItem,
      addItems,
      setItemChecked,
      removeItem,
      clearCheckedItems,
      clearAllItems,
    }),
    [
      addItem,
      addItems,
      items,
      listSchemaMissing,
      loading,
      refresh,
      removeItem,
      setItemChecked,
      setUseShoppingListForFeedFilter,
      uncheckedLabels,
      useShoppingListForFeedFilter,
      clearCheckedItems,
      clearAllItems,
    ],
  );

  return <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>;
}

export function useShoppingList() {
  const ctx = useContext(ShoppingListContext);
  if (!ctx) {
    throw new Error('useShoppingList debe usarse dentro de ShoppingListProvider');
  }
  return ctx;
}
