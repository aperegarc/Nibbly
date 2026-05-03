import type { Recipe, DietType, RecipeDifficulty } from '../../domain/entities/Recipe';
import type {
  GetRecipeByIdQuery,
  ListFavoriteRecipesQuery,
  RecipeFeedQuery,
  RecipeRepository,
  SearchRecipesByTitleQuery,
} from '../../domain/repositories/RecipeRepository';
import { AppError } from '../../shared/errors/AppError';
import { sanitizeDiscoveryTags, sanitizeShoppingListFeedTags } from '../../shared/utils/sanitize';
import { getSupabaseClient } from '../supabase/client';

const DIET_VALUES: DietType[] = [
  'balanced',
  'vegan',
  'vegetarian',
  'keto',
  'paleo',
  'gluten_free',
];

const DIFFICULTY_VALUES: RecipeDifficulty[] = ['easy', 'medium', 'hard'];

type IngredientEmbed = { name: string } | null;

type RecipeIngredientEmbed = {
  sort_order: number;
  ingredients: IngredientEmbed;
};

type RecipeQueryRow = {
  id: string;
  title: string;
  image_url: string;
  quick_steps: string[] | null;
  full_instructions?: string | null;
  cook_time_minutes: number;
  difficulty: string;
  diet_type: string;
  data_source_name?: string | null;
  data_source_url?: string | null;
  recipe_ingredients: RecipeIngredientEmbed[] | null;
};

/** Select PostgREST en una línea (válido también dentro de `recipes(...)` en favoritos). */
const RECIPE_LIST_SELECT =
  'id, title, image_url, quick_steps, full_instructions, cook_time_minutes, difficulty, diet_type, data_source_name, data_source_url, recipe_ingredients(sort_order, ingredients(name))';

type FavoriteJoinRow = {
  recipes: RecipeQueryRow | RecipeQueryRow[] | null;
};

function asDietType(value: string): DietType {
  if (DIET_VALUES.includes(value as DietType)) {
    return value as DietType;
  }
  return 'balanced';
}

function asDifficulty(value: string): RecipeDifficulty {
  if (DIFFICULTY_VALUES.includes(value as RecipeDifficulty)) {
    return value as RecipeDifficulty;
  }
  return 'medium';
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function passesAllergyGate(recipe: Recipe, allergies: string[]): boolean {
  if (allergies.length === 0) {
    return true;
  }

  const blob = `${recipe.title} ${recipe.ingredients.join(' ')}`.toLowerCase();
  return !allergies.some((entry) => {
    const token = entry.trim().toLowerCase();
    return token.length > 0 && blob.includes(token);
  });
}

/**
 * Resuelve cada etiqueta del usuario a ids del catálogo: primero coincidencia exacta (ilike sin comodines),
 * si no hay filas, búsqueda parcial. La unión de ids se usa en el feed como OR: basta con que la receta
 * use al menos uno de esos ingredientes (no hace falta que use todos los que marcaste).
 */
async function resolveIngredientIds(names: string[]): Promise<string[]> {
  const supabase = getSupabaseClient();
  const normalized = names.map((n) => n.trim()).filter((n) => n.length > 0);

  if (normalized.length === 0) {
    return [];
  }

  const resolveOne = async (name: string): Promise<string[]> => {
    const escaped = escapeIlike(name);

    const exact = await supabase.from('ingredients').select('id').ilike('name', escaped).limit(5);

    if (exact.error) {
      throw new AppError(
        exact.error.message || 'No se pudieron resolver ingredientes.',
        'INGREDIENTS_RESOLVE_FAILED',
      );
    }

    if (exact.data && exact.data.length > 0) {
      return exact.data.map((row) => row.id);
    }

    const fuzzy = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', `%${escaped}%`)
      .limit(25);

    if (fuzzy.error) {
      throw new AppError(
        fuzzy.error.message || 'No se pudieron resolver ingredientes.',
        'INGREDIENTS_RESOLVE_FAILED',
      );
    }

    return (fuzzy.data ?? []).map((row) => row.id);
  };

  const perTag = await Promise.all(normalized.map((name) => resolveOne(name)));
  const ids = new Set<string>();
  for (const list of perTag) {
    for (const id of list) {
      ids.add(id);
    }
  }

  return [...ids];
}

async function filterRecipeIdsByIngredients(ingredientIds: string[]): Promise<string[]> {
  if (ingredientIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('recipe_id')
    .in('ingredient_id', ingredientIds);

  if (error) {
    throw new AppError(error.message || 'No se pudo filtrar por ingredientes.', 'INGREDIENT_FILTER_FAILED');
  }

  return [...new Set(data?.map((row) => row.recipe_id) ?? [])];
}

/** Recetas cuyos ingredientes son todos un subconjunto de `ingredientIds` (vía RPC en Supabase). */
async function recipeIdsIngredientsSubsetOf(ingredientIds: string[]): Promise<string[]> {
  if (ingredientIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        args: { p_ingredient_ids: string[] },
      ) => Promise<{ data: { recipe_id: string }[] | null; error: { message: string } | null }>;
    }
  ).rpc('recipe_ids_ingredients_subset_of', { p_ingredient_ids: ingredientIds });

  if (error) {
    throw new AppError(
      error.message ||
        'No se pudo filtrar por lista (¿ejecutaste la migración recipe_ids_ingredients_subset_of?).',
      'INGREDIENT_SUBSET_FILTER_FAILED',
    );
  }

  return data?.map((row) => row.recipe_id).filter(Boolean) ?? [];
}

function intersectRecipeIds(listIds: string[], pantryIds: string[]): string[] {
  const pantrySet = new Set(pantryIds);
  return listIds.filter((id) => pantrySet.has(id));
}

function mapRowToRecipe(row: RecipeQueryRow): Recipe {
  const ingredientNames = (row.recipe_ingredients ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((line) => line.ingredients?.name?.trim())
    .filter((name): name is string => Boolean(name));

  const full = row.full_instructions?.trim() ?? '';
  return {
    id: row.id,
    title: row.title.trim(),
    imageUrl: row.image_url,
    ingredients: ingredientNames,
    quickSteps: row.quick_steps ?? [],
    fullInstructions: full.length > 0 ? full : null,
    cookTimeMinutes: row.cook_time_minutes,
    difficulty: asDifficulty(row.difficulty),
    dietType: asDietType(row.diet_type),
    dataSourceName: row.data_source_name ?? null,
    dataSourceUrl: row.data_source_url ?? null,
  };
}

function normalizeJoinedRecipe(raw: RecipeQueryRow | RecipeQueryRow[] | null): RecipeQueryRow | null {
  if (!raw) {
    return null;
  }
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export class SupabaseRecipeRepository implements RecipeRepository {
  public async getFeed(query: RecipeFeedQuery): Promise<Recipe[]> {
    const supabase = getSupabaseClient();
    const from = query.page * query.pageSize;
    const to = from + query.pageSize - 1;

    const pantryTags = query.matchPantryIngredients
      ? sanitizeDiscoveryTags(query.pantryIngredientNames)
      : [];
    const listTags = query.shoppingListFilterActive
      ? sanitizeShoppingListFeedTags(query.shoppingListIngredientNames)
      : [];

    let listRecipeIds: string[] | null = null;
    if (query.shoppingListFilterActive) {
      if (listTags.length === 0) {
        return [];
      }
      const listIngredientIds = await resolveIngredientIds(listTags);
      if (listIngredientIds.length === 0) {
        return [];
      }
      const subsetIds = await recipeIdsIngredientsSubsetOf(listIngredientIds);
      if (subsetIds.length === 0) {
        return [];
      }
      listRecipeIds = subsetIds;
    }

    let pantryRecipeIds: string[] | null = null;
    if (pantryTags.length > 0) {
      const pantryIngredientIds = await resolveIngredientIds(pantryTags);
      if (pantryIngredientIds.length === 0) {
        return [];
      }
      const anyMatchIds = await filterRecipeIdsByIngredients(pantryIngredientIds);
      if (anyMatchIds.length === 0) {
        return [];
      }
      pantryRecipeIds = anyMatchIds;
    }

    let allowedRecipeIds: string[] | null = null;
    if (listRecipeIds && pantryRecipeIds) {
      allowedRecipeIds = intersectRecipeIds(listRecipeIds, pantryRecipeIds);
    } else if (listRecipeIds) {
      allowedRecipeIds = listRecipeIds;
    } else if (pantryRecipeIds) {
      allowedRecipeIds = pantryRecipeIds;
    }

    if (allowedRecipeIds && allowedRecipeIds.length === 0) {
      return [];
    }

    let request = supabase.from('recipes').select(RECIPE_LIST_SELECT).eq('is_published', true);

    if (allowedRecipeIds) {
      request = request.in('id', allowedRecipeIds);
    }

    if (query.filters?.diet) {
      request = request.eq('diet_type', query.filters.diet);
    }

    if (typeof query.filters?.maxCookTimeMinutes === 'number') {
      request = request.lte('cook_time_minutes', query.filters.maxCookTimeMinutes);
    }

    if (query.filters?.difficulty) {
      request = request.eq('difficulty', query.filters.difficulty);
    }

    const { data, error } = await request
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new AppError(error.message || 'No se pudieron cargar las recetas.', 'RECIPES_FETCH_FAILED');
    }

    const mapped =
      (data as RecipeQueryRow[] | null)?.map(mapRowToRecipe).filter((recipe) =>
        passesAllergyGate(recipe, query.preferences.allergies),
      ) ?? [];

    return mapped;
  }

  public async searchPublishedByTitle(query: SearchRecipesByTitleQuery): Promise<Recipe[]> {
    const raw = query.titleQuery.trim();
    if (raw.length < 2) {
      return [];
    }

    const supabase = getSupabaseClient();
    const lim = Math.min(Math.max(query.limit ?? 24, 1), 40);
    const pattern = `%${escapeIlike(raw)}%`;

    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_LIST_SELECT)
      .eq('is_published', true)
      .ilike('title', pattern)
      .order('title', { ascending: true })
      .limit(lim);

    if (error) {
      throw new AppError(error.message || 'No se pudieron buscar recetas.', 'RECIPES_SEARCH_FAILED');
    }

    return (
      (data as RecipeQueryRow[] | null)
        ?.map(mapRowToRecipe)
        .filter((recipe) => passesAllergyGate(recipe, query.preferences.allergies)) ?? []
    );
  }

  public async getById(query: GetRecipeByIdQuery): Promise<Recipe | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('recipes')
      .select(RECIPE_LIST_SELECT)
      .eq('id', query.recipeId)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message || 'No se pudo cargar la receta.', 'RECIPE_FETCH_FAILED');
    }

    if (!data) {
      return null;
    }

    const recipe = mapRowToRecipe(data as RecipeQueryRow);
    if (!passesAllergyGate(recipe, query.preferences.allergies)) {
      return null;
    }

    return recipe;
  }

  public async listFavoriteRecipes(query: ListFavoriteRecipesQuery): Promise<Recipe[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('favorites')
      .select(`recipes(${RECIPE_LIST_SELECT})`)
      .eq('user_id', query.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(error.message || 'No se pudieron cargar favoritos.', 'FAVORITES_FETCH_FAILED');
    }

    const rows = (data as FavoriteJoinRow[] | null) ?? [];
    const mapped: Recipe[] = [];

    for (const row of rows) {
      const recipeRow = normalizeJoinedRecipe(row.recipes);
      if (!recipeRow) {
        continue;
      }
      const recipe = mapRowToRecipe(recipeRow);
      if (passesAllergyGate(recipe, query.preferences.allergies)) {
        mapped.push(recipe);
      }
    }

    return mapped;
  }

  public async saveFavorite(userId: string, recipeId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('favorites').insert({
      user_id: userId,
      recipe_id: recipeId,
    });

    if (error) {
      if (error.code === '23505') {
        return;
      }
      throw new AppError(error.message || 'No se pudo guardar el favorito.', 'FAVORITE_SAVE_FAILED');
    }
  }

  public async removeFavorite(userId: string, recipeId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);

    if (error) {
      throw new AppError(error.message || 'No se pudo quitar el favorito.', 'FAVORITE_REMOVE_FAILED');
    }
  }
}
