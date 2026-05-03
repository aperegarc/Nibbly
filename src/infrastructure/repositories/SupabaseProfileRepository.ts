import type { DietType } from '../../domain/entities/Recipe';
import type { UserProfile } from '../../domain/entities/UserProfile';
import type { OnboardingPayload, ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { AppError } from '../../shared/errors/AppError';
import { sanitizeProfileTags } from '../../shared/utils/sanitize';
import { getSupabaseClient } from '../supabase/client';

const DIET_VALUES: DietType[] = [
  'balanced',
  'vegan',
  'vegetarian',
  'keto',
  'paleo',
  'gluten_free',
];

function asDietType(value: string): DietType {
  if (DIET_VALUES.includes(value as DietType)) {
    return value as DietType;
  }
  return 'balanced';
}

function mapRow(row: {
  id: string;
  display_name: string | null;
  diet: string;
  allergies: string[] | null;
  preferences: string[] | null;
  onboarding_completed_at: string | null;
}): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    diet: asDietType(row.diet),
    allergies: row.allergies ?? [],
    preferences: row.preferences ?? [],
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

export class SupabaseProfileRepository implements ProfileRepository {
  public async getByUserId(userId: string): Promise<UserProfile | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, diet, allergies, preferences, onboarding_completed_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new AppError(error.message || 'No se pudo cargar el perfil.', 'PROFILE_FETCH_FAILED');
    }

    if (!data) {
      return null;
    }

    return mapRow(data);
  }

  public async completeOnboarding(userId: string, payload: OnboardingPayload): Promise<UserProfile> {
    if (!DIET_VALUES.includes(payload.diet)) {
      throw new AppError('Dieta no válida.', 'INVALID_DIET');
    }

    const allergies = sanitizeProfileTags(payload.allergies);
    const preferences = sanitizeProfileTags(payload.preferences);
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        diet: payload.diet,
        allergies,
        preferences,
        onboarding_completed_at: now,
      })
      .eq('id', userId)
      .select('id, display_name, diet, allergies, preferences, onboarding_completed_at')
      .single();

    if (error) {
      throw new AppError(error.message || 'No se pudo guardar el perfil.', 'PROFILE_UPDATE_FAILED');
    }

    return mapRow(data);
  }
}
