import { DefaultTheme, type Theme } from '@react-navigation/native';

import { colors } from './colors';

/** Tema claro alineado con la paleta Nibbly para headers y tabs. */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surfaceCard,
    text: colors.textPrimary,
    border: colors.borderSoft,
    notification: colors.accentWarm,
  },
};
