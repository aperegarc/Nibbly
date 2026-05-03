export type AuthUserSnapshot = {
  id: string;
  email: string | undefined;
};

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export interface AuthRepository {
  getSessionUser(): Promise<AuthUserSnapshot | null>;
  signInWithEmail(email: string, password: string): Promise<{ errorMessage: string | null }>;
  signUpWithEmail(email: string, password: string): Promise<{
    errorMessage: string | null;
    result: SignUpResult | null;
  }>;
  signOut(): Promise<{ errorMessage: string | null }>;
}
