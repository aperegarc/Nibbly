/**
 * Estados visuales de la mascota (un PNG por estado en `assets/nibbly/`).
 * `idle` usa el mismo arte que `feliz` (reposo acogedor).
 */
export type NibblyState =
  | 'idle'
  | 'alegre'
  | 'celebrando'
  | 'pensativa'
  | 'cocinera'
  | 'dudosa'
  | 'feliz';
