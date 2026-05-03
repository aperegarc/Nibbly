import { LIMITS } from './limits';

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * Normaliza texto libre del usuario: trim, quita controles y colapsa espacios.
 * Devuelve null si queda vacío tras normalizar.
 */
export function sanitizeUserTag(raw: string, maxLength: number): string | null {
  const collapsed = raw
    .replace(CONTROL_CHARS, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!collapsed) {
    return null;
  }

  if (collapsed.length > maxLength) {
    return collapsed.slice(0, maxLength).trimEnd();
  }

  return collapsed;
}

/**
 * Lista deduplicada (insensible a mayúsculas), orden de llegada, tope de elementos.
 */
export function sanitizeUserTagList(
  items: readonly string[],
  maxItems: number,
  maxLength: number,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const value = sanitizeUserTag(item, maxLength);
    if (!value) {
      continue;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
    if (result.length >= maxItems) {
      break;
    }
  }

  return result;
}

export function sanitizeDiscoveryTags(tags: readonly string[]): string[] {
  return sanitizeUserTagList(tags, LIMITS.discoveryTagMaxCount, LIMITS.discoveryTagMaxLength);
}

/** Etiquetas de la lista de la compra aplicadas al filtro del feed (más tope que nevera). */
export function sanitizeShoppingListFeedTags(tags: readonly string[]): string[] {
  return sanitizeUserTagList(tags, 200, LIMITS.shoppingItemMaxLength);
}

export function sanitizeProfileTags(tags: readonly string[]): string[] {
  return sanitizeUserTagList(tags, LIMITS.profileTagMaxCount, LIMITS.profileTagMaxLength);
}
