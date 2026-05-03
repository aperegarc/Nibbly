import type { NibblyState } from './nibblyTypes';

/**
 * Guía de intención ↔ estado (para copies de UI y pantallas).
 * Ej.: loading → pensativa; sin resultados → dudosa.
 */
export const nibblySemantics = {
  loading: 'pensativa' satisfies NibblyState,
  thinking: 'pensativa' satisfies NibblyState,
  recipeFound: 'feliz' satisfies NibblyState,
  happy: 'feliz' satisfies NibblyState,
  noResults: 'dudosa' satisfies NibblyState,
  confused: 'dudosa' satisfies NibblyState,
  saving: 'celebrando' satisfies NibblyState,
  celebrating: 'celebrando' satisfies NibblyState,
  cooking: 'cocinera' satisfies NibblyState,
  cheerful: 'alegre' satisfies NibblyState,
  idle: 'idle' satisfies NibblyState,
} as const;
