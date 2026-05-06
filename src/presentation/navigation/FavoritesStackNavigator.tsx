import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CookingModeScreen } from '../screens/CookingModeScreen';
import { CreateRecipeScreen } from '../screens/CreateRecipeScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { RecipeDetailScreen } from '../screens/RecipeDetailScreen';
import { colors } from '../theme/colors';
import type { FavoritesStackParamList } from './types';

const Stack = createNativeStackNavigator<FavoritesStackParamList>();

export function FavoritesStackNavigator() {
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
        name="FavoritesHome"
        component={FavoritesScreen}
        options={{ title: 'Favoritos', headerLargeTitle: false }}
      />
      <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} options={{ title: 'Crear receta' }} />
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
