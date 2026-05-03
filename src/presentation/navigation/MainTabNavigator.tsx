import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { Platform, StyleSheet } from 'react-native';

import { ShoppingListScreen } from '../screens/ShoppingListScreen';
import { colors } from '../theme/colors';
import { elevation } from '../theme/shadows';
import { fontFamilies } from '../theme/fonts';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { FavoritesStackNavigator } from './FavoritesStackNavigator';
import { FeedStackNavigator } from './FeedStackNavigator';
import { WeeklyStackNavigator } from './WeeklyStackNavigator';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function StitchTabBarButton(props: BottomTabBarButtonProps) {
  const selected = props.accessibilityState?.selected ?? false;
  return (
    <PlatformPressable
      {...props}
      style={[props.style, styles.tabItem, selected && styles.tabItemActive]}
    />
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.tabActiveTint,
        tabBarInactiveTintColor: colors.tabInactiveTint,
        tabBarButton: (props) => <StitchTabBarButton {...props} />,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 237, 213, 0.9)',
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? 22 : 12,
          minHeight: Platform.OS === 'ios' ? 62 : 64,
          borderTopLeftRadius: radius.xxl,
          borderTopRightRadius: radius.xxl,
          overflow: 'hidden',
          ...elevation.tabBar,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies.bold,
          fontSize: 11,
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedStackNavigator}
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WeeklyTab"
        component={WeeklyStackNavigator}
        options={{
          title: 'Menú',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ShoppingTab"
        component={ShoppingListScreen}
        options={{
          title: 'Lista',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'basket' : 'basket-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.lg,
    marginHorizontal: 2,
  },
  tabItemActive: {
    backgroundColor: colors.tabActiveBg,
  },
});
