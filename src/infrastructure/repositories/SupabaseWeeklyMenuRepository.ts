import type { MealType, WeekPlan, WeeklySlotRecipe } from '../../domain/entities/WeeklyMenu';
import { emptyWeek } from '../../domain/entities/WeeklyMenu';
import { AppError } from '../../shared/errors/AppError';
import { getSupabaseClient } from '../supabase/client';

type RecipeEmbed = { id: string; title: string; image_url: string } | null;

type SlotRow = {
  day_of_week: number;
  meal_type: string;
  recipe_id: string;
  recipes: RecipeEmbed | RecipeEmbed[];
};

function normalizeRecipe(raw: RecipeEmbed | RecipeEmbed[]): WeeklySlotRecipe | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.id || !row.title) {
    return null;
  }
  return {
    recipeId: row.id,
    title: row.title.trim(),
    imageUrl: row.image_url,
  };
}

export class SupabaseWeeklyMenuRepository {
  public async fetchWeek(userId: string): Promise<WeekPlan> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('weekly_menu_slots')
      .select(
        `
        day_of_week,
        meal_type,
        recipe_id,
        recipes ( id, title, image_url )
      `,
      )
      .eq('user_id', userId);

    if (error) {
      throw new AppError(error.message || 'No se pudo cargar el menú semanal.', 'WEEKLY_MENU_FETCH_FAILED');
    }

    const week = emptyWeek();
    for (const row of (data as SlotRow[] | null) ?? []) {
      const meal = row.meal_type as MealType;
      if (row.day_of_week < 0 || row.day_of_week > 6) {
        continue;
      }
      if (meal !== 'breakfast' && meal !== 'lunch' && meal !== 'dinner') {
        continue;
      }
      const mapped = normalizeRecipe(row.recipes);
      if (mapped) {
        const day = week[row.day_of_week];
        if (day) {
          day[meal] = mapped;
        }
      }
    }
    return week;
  }

  public async setSlot(
    userId: string,
    dayIndex: number,
    meal: MealType,
    recipe: WeeklySlotRecipe | null,
  ): Promise<void> {
    const supabase = getSupabaseClient();

    if (recipe === null) {
      const { error } = await supabase
        .from('weekly_menu_slots')
        .delete()
        .eq('user_id', userId)
        .eq('day_of_week', dayIndex)
        .eq('meal_type', meal);

      if (error) {
        throw new AppError(error.message || 'No se pudo vaciar el hueco.', 'WEEKLY_MENU_DELETE_FAILED');
      }
      return;
    }

    const { error } = await supabase.from('weekly_menu_slots').upsert(
      {
        user_id: userId,
        day_of_week: dayIndex,
        meal_type: meal,
        recipe_id: recipe.recipeId,
      },
      { onConflict: 'user_id,day_of_week,meal_type' },
    );

    if (error) {
      throw new AppError(error.message || 'No se pudo guardar el menú.', 'WEEKLY_MENU_UPSERT_FAILED');
    }
  }

  public async clearWeek(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('weekly_menu_slots').delete().eq('user_id', userId);

    if (error) {
      throw new AppError(error.message || 'No se pudo limpiar el menú.', 'WEEKLY_MENU_CLEAR_FAILED');
    }
  }
}
