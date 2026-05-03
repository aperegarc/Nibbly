import { fontFamilies } from './fonts';

export const typography = {
  display: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    letterSpacing: -0.75,
    lineHeight: 38,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    letterSpacing: -0.45,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.35,
  },
} as const;
