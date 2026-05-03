import type { Recipe } from '../../domain/entities/Recipe';

/**
 * Pasos para modo cocinar: prioriza `quickSteps`; si no hay, parte `fullInstructions`.
 */
export function getCookingSteps(recipe: Recipe): string[] {
  const fromQuick = recipe.quickSteps.map((s) => s.trim()).filter((s) => s.length > 0);
  if (fromQuick.length > 0) {
    return fromQuick;
  }

  const full = recipe.fullInstructions?.trim();
  if (!full) {
    return [];
  }

  const numberedSplit = full.split(/\n(?=\s*\d+[\.\)]\s+)/);
  if (numberedSplit.length > 1) {
    return numberedSplit
      .map((block) => block.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter((s) => s.length > 0);
  }

  const paragraphs = full
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length > 1) {
    return paragraphs;
  }

  const lines = full
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length > 1) {
    return lines;
  }

  return [full];
}

const MINUTES_REGEX =
  /(\d+)\s*(?:min(?:utos?)?|mins?|m)(?=\s|$|[\.,;:!?])/i;

/**
 * Si el texto del paso menciona minutos (p. ej. "20 minutos"), devuelve ese número.
 */
export function extractSuggestedMinutesFromStep(stepText: string): number | null {
  const m = stepText.match(MINUTES_REGEX);
  if (!m) {
    return null;
  }
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0 || n > 24 * 60) {
    return null;
  }
  return n;
}
