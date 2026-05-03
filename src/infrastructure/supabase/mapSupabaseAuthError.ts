import type { AuthError } from '@supabase/supabase-js';

export function mapSupabaseAuthError(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Correo o contraseña incorrectos.';
    case 'Email not confirmed':
      return 'Debes confirmar el correo antes de iniciar sesión.';
    case 'User already registered':
      return 'Ya existe una cuenta con este correo.';
    default:
      break;
  }

  if (error.status === 429) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }

  if (error.message.toLowerCase().includes('network')) {
    return 'No hay conexión. Comprueba tu red e inténtalo de nuevo.';
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
