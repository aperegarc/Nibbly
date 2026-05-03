import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { SupabaseAuthRepository } from '../../infrastructure/supabase/SupabaseAuthRepository';
import { getSupabaseClient } from '../../infrastructure/supabase/client';

type AuthContextValue = {
  session: Session | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<{ errorMessage: string | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ errorMessage: string | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<{ errorMessage: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const repository = useMemo(() => new SupabaseAuthRepository(), []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) {
        return;
      }
      if (error) {
        console.error('No se pudo restaurar la sesión', error);
      }
      setSession(data.session ?? null);
      setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    (email: string, password: string) => repository.signInWithEmail(email, password),
    [repository],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const outcome = await repository.signUpWithEmail(email, password);
      if (outcome.errorMessage) {
        return { errorMessage: outcome.errorMessage, needsEmailConfirmation: false };
      }
      if (!outcome.result) {
        return { errorMessage: 'No se pudo crear la cuenta.', needsEmailConfirmation: false };
      }
      return {
        errorMessage: null,
        needsEmailConfirmation: outcome.result.needsEmailConfirmation,
      };
    },
    [repository],
  );

  const signOut = useCallback(() => repository.signOut(), [repository]);

  const value = useMemo(
    () => ({
      session,
      initializing,
      signIn,
      signUp,
      signOut,
    }),
    [session, initializing, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.');
  }
  return context;
}
