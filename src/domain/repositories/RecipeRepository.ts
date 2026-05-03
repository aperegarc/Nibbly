import type { Recipe, RecipeDifficulty, DietType } from '../entities/Recipe';
import type { UserPreferences } from '../entities/UserPreferences';

export type RecipeFilters = {
  diet?: DietType;
  maxCookTimeMinutes?: number;
  difficulty?: RecipeDifficulty;
};

export type RecipeFeedQuery = {
  userId: string;
  preferences: UserPreferences;
  filters?: RecipeFilters;
  page: number;
  pageSize: number;
  /** Nevera: nombres en catálogo; si matchPantryIngredients, recetas con al menos uno de estos. */
  pantryIngredientNames: string[];
  matchPantryIngredients: boolean;
  /**
   * Lista pendiente: si shoppingListFilterActive, solo recetas cuyos ingredientes ⊆ lista resuelta
   * (todos los de la receta deben estar en la lista; la receta no tiene que usar toda la lista).
   */
  shoppingListIngredientNames: string[];
  shoppingListFilterActive: boolean;
};

export type GetRecipeByIdQuery = {
  recipeId: string;
  preferences: UserPreferences;
};

export type ListFavoriteRecipesQuery = {
  userId: string;
  preferences: UserPreferences;
};

export type SearchRecipesByTitleQuery = {
  /** Texto parcial del título (mínimo 2 caracteres en el repositorio). */
  titleQuery: string;
  preferences: UserPreferences;
  limit?: number;
};

export interface RecipeRepository {
  getFeed(query: RecipeFeedQuery): Promise<Recipe[]>;
  getById(query: GetRecipeByIdQuery): Promise<Recipe | null>;
  listFavoriteRecipes(query: ListFavoriteRecipesQuery): Promise<Recipe[]>;
  searchPublishedByTitle(query: SearchRecipesByTitleQuery): Promise<Recipe[]>;
  saveFavorite(userId: string, recipeId: string): Promise<void>;
  removeFavorite(userId: string, recipeId: string): Promise<void>;
}
