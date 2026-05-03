import type { DietType } from './Recipe';

export type UserPreferences = {
  diet: DietType;
  allergies: string[];
  preferences: string[];
};
