import type { DietType } from '../entities/Recipe';
import type { UserProfile } from '../entities/UserProfile';

export type OnboardingPayload = {
  diet: DietType;
  allergies: string[];
  preferences: string[];
};

export interface ProfileRepository {
  getByUserId(userId: string): Promise<UserProfile | null>;
  completeOnboarding(userId: string, payload: OnboardingPayload): Promise<UserProfile>;
}
