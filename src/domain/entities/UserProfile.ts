import type { DietType } from './Recipe';

export type UserProfile = {
  id: string;
  displayName: string | null;
  diet: DietType;
  allergies: string[];
  preferences: string[];
  onboardingCompletedAt: string | null;
};
