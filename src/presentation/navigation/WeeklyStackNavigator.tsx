import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CookingModeScreen } from '../screens/CookingModeScreen';
import { WeeklyMenuScreen } from '../screens/WeeklyMenuScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { colors } from '../theme/colors';
import type { WeeklyStackParamList } from './types';

const Stack = createNativeStackNavigator<WeeklyStackParamList>();

export function WeeklyStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="WeeklyHome"
        component={WeeklyMenuScreen}
        options={{ title: 'Menú semanal', headerLargeTitle: false }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: 'Receta' }}
      />
      <Stack.Screen
        name="CookingMode"
        component={CookingModeScreen}
        options={{ title: 'Cocinar' }}
      />
    </Stack.Navigator>
  );
}
