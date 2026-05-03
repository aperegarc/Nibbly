/** Límites alineados con el esquema y la UX; validar antes de persistir o consultar. */

export const LIMITS = {
  profileTagMaxLength: 80,
  profileTagMaxCount: 50,
  discoveryTagMaxLength: 120,
  discoveryTagMaxCount: 12,
  shoppingItemMaxLength: 200,
} as const;
