import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { MealType, WeekPlan, WeeklySlotRecipe } from '../../domain/entities/WeeklyMenu';
import { emptyDaySlots, emptyWeek, isWeekEmpty } from '../../domain/entities/WeeklyMenu';
import { SupabaseWeeklyMenuRepository } from '../../infrastructure/repositories/SupabaseWeeklyMenuRepository';
import { useAuth } from './AuthProvider';

const LEGACY_STORAGE_KEY = (userId: string) => `@recepy/weekly_menu_v1/${userId}`;

async function migrateLegacyIfNeeded(
  userId: string,
  repository: SupabaseWeeklyMenuRepository,
  current: WeekPlan,
): Promise<void> {
  if (!isWeekEmpty(current)) {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY(userId));
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, WeeklySlotRecipe | null>;
    for (let d = 0; d < 7; d += 1) {
      const v = parsed[String(d)];
      if (v?.recipeId && v.title) {
        await repository.setSlot(userId, d, 'lunch', v);
      }
    }
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY(userId));
  } catch {
    /* ignorar migración rota */
  }
}

type WeeklyMenuContextValue = {
  assignments: WeekPlan;
  loading: boolean;
  /** Primera carga del menú desde Supabase completada (o intentada). */
  initialized: boolean;
  refresh: () => Promise<void>;
  setSlot: (dayIndex: number, meal: MealType, recipe: WeeklySlotRecipe | null) => Promise<void>;
  clearWeek: () => Promise<void>;
};

const WeeklyMenuContext = createContext<WeeklyMenuContextValue | null>(null);

export function WeeklyMenuProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const repository = useMemo(() => new SupabaseWeeklyMenuRepository(), []);
  const [assignments, setAssignments] = useState<WeekPlan>(emptyWeek);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAssignments(emptyWeek());
      setInitialized(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setAssignments(emptyWeek());
      setInitialized(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let week = await repository.fetchWeek(userId);
      if (isWeekEmpty(week)) {
        await migrateLegacyIfNeeded(userId, repository, week);
        week = await repository.fetchWeek(userId);
      }
      setAssignments(week);
    } catch (e) {
      console.error('Menú semanal', e);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [repository, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSlot = useCallback(
    async (dayIndex: number, meal: MealType, recipe: WeeklySlotRecipe | null) => {
      if (!userId || dayIndex < 0 || dayIndex > 6) {
        return;
      }
      let snapshot: WeekPlan = emptyWeek();
      setAssignments((w) => {
        snapshot = w;
        const day = { ...emptyDaySlots(), ...w[dayIndex], [meal]: recipe };
        return { ...w, [dayIndex]: day };
      });
      try {
        await repository.setSlot(userId, dayIndex, meal, recipe);
      } catch (e) {
        console.error('Menú semanal guardar', e);
        setAssignments(snapshot);
      }
    },
    [repository, userId],
  );

  const clearWeek = useCallback(async () => {
    if (!userId) {
      return;
    }
    let snapshot: WeekPlan = emptyWeek();
    setAssignments((p) => {
      snapshot = p;
      return emptyWeek();
    });
    try {
      await repository.clearWeek(userId);
    } catch (e) {
      console.error('Menú semanal limpiar', e);
      setAssignments(snapshot);
    }
  }, [repository, userId]);

  const value = useMemo(
    () => ({
      assignments,
      loading,
      initialized,
      refresh,
      setSlot,
      clearWeek,
    }),
    [assignments, clearWeek, initialized, loading, refresh, setSlot],
  );

  return <WeeklyMenuContext.Provider value={value}>{children}</WeeklyMenuContext.Provider>;
}

export function useWeeklyMenu() {
  const ctx = useContext(WeeklyMenuContext);
  if (!ctx) {
    throw new Error('useWeeklyMenu debe usarse dentro de WeeklyMenuProvider');
  }
  return ctx;
}

export type { MealType, WeeklySlotRecipe } from '../../domain/entities/WeeklyMenu';
export { MEAL_LABELS, MEAL_ORDER } from '../../domain/entities/WeeklyMenu';
