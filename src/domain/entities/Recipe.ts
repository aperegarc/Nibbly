export type DietType =
  | 'balanced'
  | 'vegan'
  | 'vegetarian'
  | 'keto'
  | 'paleo'
  | 'gluten_free';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type Recipe = {
  id: string;
  title: string;
  imageUrl: string;
  /** Nombres de ingredientes para mostrar en tarjeta (orden de la receta). */
  ingredients: string[];
  quickSteps: string[];
  /** Instrucciones completas (p. ej. texto largo en español). */
  fullInstructions: string | null;
  cookTimeMinutes: number;
  difficulty: RecipeDifficulty;
  dietType: DietType;
  /** Atribución legal del contenido (proveedor de datos). */
  dataSourceName: string | null;
  dataSourceUrl: string | null;
};
