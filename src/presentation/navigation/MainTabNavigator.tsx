import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

import { ShoppingListScreen } from '../screens/ShoppingListScreen';
import { colors } from '../theme/colors';
import { elevation } from '../theme/shadows';
import { fontFamilies } from '../theme/fonts';
import { spacing } from '../theme/spacing';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';
import { FeedStackNavigator } from './FeedStackNavigator';
import { WeeklyStackNavigator } from './WeeklyStackNavigator';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopWidth: 0,
          paddingTop: spacing.xs,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          minHeight: Platform.OS === 'ios' ? 58 : 60,
          ...elevation.tabBar,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies.semiBold,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="WeeklyTab"
        component={WeeklyStackNavigator}
        options={{
          title: 'Menú',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingListScreen}
        options={{
          title: 'Lista',
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitle: 'Lista de la compra',
          tabBarIcon: ({ color, size }) => <Ionicons name="cart-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
