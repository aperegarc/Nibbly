import { fontFamilies } from './fonts';

export const typography = {
  display: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    letterSpacing: -0.35,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  caption: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
  },
} as const;
