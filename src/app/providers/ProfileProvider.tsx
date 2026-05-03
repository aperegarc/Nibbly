import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { UserProfile } from '../../domain/entities/UserProfile';
import type { OnboardingPayload } from '../../domain/repositories/ProfileRepository';
import { SupabaseProfileRepository } from '../../infrastructure/repositories/SupabaseProfileRepository';
import { useAuth } from './AuthProvider';

type ProfileContextValue = {
  profile: UserProfile | null;
  isReady: boolean;
  refreshProfile: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<UserProfile>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const repository = useMemo(() => new SupabaseProfileRepository(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  const userId = session?.user.id;

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const next = await repository.getByUserId(userId);
    setProfile(next);
  }, [repository, userId]);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setProfile(null);
      setIsReady(true);
      return () => {
        active = false;
      };
    }

    setIsReady(false);
    repository
      .getByUserId(userId)
      .then((data) => {
        if (!active) {
          return;
        }
        setProfile(data);
      })
      .catch((error) => {
        console.error('Error al cargar perfil', error);
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [repository, userId]);

  const completeOnboarding = useCallback(
    async (payload: OnboardingPayload) => {
      if (!userId) {
        throw new Error('No hay sesión activa.');
      }
      const next = await repository.completeOnboarding(userId, payload);
      setProfile(next);
      return next;
    },
    [repository, userId],
  );

  const value = useMemo(
    () => ({
      profile,
      isReady,
      refreshProfile,
      completeOnboarding,
    }),
    [profile, isReady, refreshProfile, completeOnboarding],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe usarse dentro de ProfileProvider.');
  }
  return context;
}
