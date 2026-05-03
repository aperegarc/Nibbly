import { Platform, type ViewStyle } from 'react-native';

const shadowColor = '#2C2824';

export const elevation = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: { elevation: 4 },
    default: {},
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
    android: { elevation: 7 },
    default: {},
  }),
  tabBar: Platform.select<ViewStyle>({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
    },
    android: { elevation: 10 },
    default: {},
  }),
} as const;
