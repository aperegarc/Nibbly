const EMAIL_RE =
  /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return 'Introduce un correo electrónico.';
  }

  if (normalized.length > 254) {
    return 'El correo es demasiado largo.';
  }

  if (!EMAIL_RE.test(normalized)) {
    return 'El formato del correo no es válido.';
  }

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }

  if (password.length > 128) {
    return 'La contraseña es demasiado larga.';
  }

  return null;
}
