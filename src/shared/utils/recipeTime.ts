export type RecipeTimeBucket = 'short' | 'medium' | 'long';

export function getRecipeTimeBucket(minutes: number): RecipeTimeBucket {
  if (minutes <= 20) return 'short';
  if (minutes <= 45) return 'medium';
  return 'long';
}

export function getRecipeTimeBucketLabel(minutes: number): string {
  const bucket = getRecipeTimeBucket(minutes);
  if (bucket === 'short') return 'Corto';
  if (bucket === 'medium') return 'Medio';
  return 'Largo';
}

