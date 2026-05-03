import type { DietType } from '../../domain/entities/Recipe';

export const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'vegan', label: 'Vegana' },
  { value: 'vegetarian', label: 'Vegetariana' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'gluten_free', label: 'Sin gluten' },
];
