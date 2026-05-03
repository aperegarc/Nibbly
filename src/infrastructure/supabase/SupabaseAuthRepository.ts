import type { AuthRepository, AuthUserSnapshot, SignUpResult } from '../../domain/repositories/AuthRepository';
import { mapSupabaseAuthError } from './mapSupabaseAuthError';
import { getSupabaseClient } from './client';

export class SupabaseAuthRepository implements AuthRepository {
  public async getSessionUser(): Promise<AuthUserSnapshot | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('getSession', error);
      return null;
    }

    const user = data.session?.user;
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  public async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ errorMessage: string | null }> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { errorMessage: mapSupabaseAuthError(error) };
    }

    return { errorMessage: null };
  }

  public async signUpWithEmail(
    email: string,
    password: string,
  ): Promise<{ errorMessage: string | null; result: SignUpResult | null }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { errorMessage: mapSupabaseAuthError(error), result: null };
    }

    if (!data.user) {
      return { errorMessage: 'No se pudo crear la cuenta.', result: null };
    }

    const needsEmailConfirmation = Boolean(data.user) && !data.session;

    return {
      errorMessage: null,
      result: { needsEmailConfirmation },
    };
  }

  public async signOut(): Promise<{ errorMessage: string | null }> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { errorMessage: mapSupabaseAuthError(error) };
    }

    return { errorMessage: null };
  }
}
