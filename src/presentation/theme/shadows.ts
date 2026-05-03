import { Platform, type ViewStyle } from 'react-native';

const warmShadow = 'rgba(155, 69, 0, 0.14)';
const inkShadow = 'rgba(30, 27, 24, 0.12)';

export const elevation = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warmShadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
    },
    android: { elevation: 6 },
    default: {},
  }),
  cardSoft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warmShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
    android: { elevation: 3 },
    default: {},
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: inkShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  }),
  tabBar: Platform.select<ViewStyle>({
    ios: {
      shadowColor: warmShadow,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
    },
    android: { elevation: 12 },
    default: {},
  }),
  primaryButton: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#9b4500',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    android: { elevation: 5 },
    default: {},
  }),
} as const;
