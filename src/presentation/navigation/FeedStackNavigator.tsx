import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CookingModeScreen } from '../screens/CookingModeScreen';
import { FeedHomeScreen } from '../screens/FeedHomeScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { RecipeSearchScreen } from '../screens/RecipeSearchScreen';
import { colors } from '../theme/colors';
import type { FeedStackParamList } from './types';

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedStackNavigator() {
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
        name="FeedHome"
        component={FeedHomeScreen}
        options={{ title: 'Nibbly', headerLargeTitle: false }}
      />
      <Stack.Screen
        name="RecipeSearch"
        component={RecipeSearchScreen}
        options={{ title: 'Buscar' }}
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
