import type { Recipe } from '../../domain/entities/Recipe';
import type { RecipeFilters } from '../../domain/repositories/RecipeRepository';

const MIN_SUBSTRING_LEN = 4;

function normalizeIngredientToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Cobertura alineada con la idea del feed (ingredientes de la receta ⊆ lista), pero tolerante a
 * cómo el usuario escribe en la lista frente a nombres de catálogo: igualdad insensible a mayúsculas
 * o subcadena si ambas partes tienen longitud ≥ MIN_SUBSTRING_LEN (evita matches con "sal", "pan").
 */
export function recipeIngredientCoveredByAnyLabel(ingredient: string, labels: string[]): boolean {
  const ing = normalizeIngredientToken(ingredient);
  if (!ing) {
    return false;
  }
  for (const raw of labels) {
    const lab = normalizeIngredientToken(raw);
    if (!lab) {
      continue;
    }
    if (ing === lab) {
      return true;
    }
    if (
      ing.length >= MIN_SUBSTRING_LEN &&
      lab.length >= MIN_SUBSTRING_LEN &&
      (ing.includes(lab) || lab.includes(ing))
    ) {
      return true;
    }
  }
  return false;
}

export function recipeMatchesFilters(recipe: Recipe, filters: RecipeFilters): boolean {
  if (filters.diet && recipe.dietType !== filters.diet) {
    return false;
  }
  if (
    typeof filters.maxCookTimeMinutes === 'number' &&
    Number.isFinite(filters.maxCookTimeMinutes) &&
    recipe.cookTimeMinutes > filters.maxCookTimeMinutes
  ) {
    return false;
  }
  if (filters.difficulty && recipe.difficulty !== filters.difficulty) {
    return false;
  }
  return true;
}

/** Misma idea que el feed con lista: cada ingrediente de la receta debe quedar cubierto por la lista. */
export function recipeIngredientsCoveredByShoppingLabels(recipe: Recipe, labels: string[]): boolean {
  if (labels.length === 0 || recipe.ingredients.length === 0) {
    return false;
  }
  const trimmed = labels.map((l) => l.trim()).filter((l) => l.length > 0);
  if (trimmed.length === 0) {
    return false;
  }
  return recipe.ingredients.every((ing) => recipeIngredientCoveredByAnyLabel(ing, trimmed));
}
