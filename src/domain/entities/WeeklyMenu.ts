export type MealType = 'breakfast' | 'lunch' | 'dinner';

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
};

export type WeeklySlotRecipe = {
  recipeId: string;
  title: string;
  imageUrl: string;
};

export type DaySlots = Record<MealType, WeeklySlotRecipe | null>;

/** Lunes = 0 … Domingo = 6 */
export type WeekPlan = Record<number, DaySlots>;

export function emptyDaySlots(): DaySlots {
  return {
    breakfast: null,
    lunch: null,
    dinner: null,
  };
}

export function emptyWeek(): WeekPlan {
  const next: WeekPlan = {};
  for (let d = 0; d < 7; d += 1) {
    next[d] = emptyDaySlots();
  }
  return next;
}

export function isWeekEmpty(week: WeekPlan): boolean {
  for (let d = 0; d < 7; d += 1) {
    const s = week[d];
    if (!s) {
      continue;
    }
    if (s.breakfast || s.lunch || s.dinner) {
      return false;
    }
  }
  return true;
}

/** Ids de receta únicos asignados en la semana (orden: lunes→domingo, desayuno→cena). */
export function collectUniqueRecipeIdsFromWeek(week: WeekPlan): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let d = 0; d < 7; d += 1) {
    const day = week[d];
    if (!day) {
      continue;
    }
    for (const meal of MEAL_ORDER) {
      const slot = day[meal];
      const id = slot?.recipeId;
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** Índice 0 = lunes … 6 = domingo (alineado con la app). */
export function getMondayBasedDayIndex(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}
