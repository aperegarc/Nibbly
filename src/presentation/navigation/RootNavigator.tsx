import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../../app/providers/AuthProvider';
import { DiscoveryPreferencesProvider } from '../../app/providers/DiscoveryPreferencesProvider';
import { ProfileProvider, useProfile } from '../../app/providers/ProfileProvider';
import { ShoppingListProvider } from '../../app/providers/ShoppingListProvider';
import { WeeklyMenuProvider } from '../../app/providers/WeeklyMenuProvider';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { colors } from '../theme/colors';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { MainTabNavigator } from './MainTabNavigator';
import type { AppStackParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Entrar', headerLargeTitle: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Crear cuenta', headerLargeTitle: false }}
      />
    </AuthStack.Navigator>
  );
}

function AppGate() {
  const { isReady, profile } = useProfile();

  if (!isReady) {
    return (
      <View style={styles.loading} accessibilityLabel="Cargando perfil">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const onboardingDone = Boolean(profile?.onboardingCompletedAt);
  const discoveryKey = `${profile?.id ?? 'anon'}-${onboardingDone ? 'ready' : 'onboarding'}`;

  return (
    <DiscoveryPreferencesProvider key={discoveryKey} seed={{ diet: profile?.diet ?? 'balanced' }}>
      <AppStack.Navigator
        initialRouteName={onboardingDone ? 'Main' : 'Onboarding'}
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <AppStack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <AppStack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      </AppStack.Navigator>
    </DiscoveryPreferencesProvider>
  );
}

function AppNavigator() {
  return (
    <ProfileProvider>
      <ShoppingListProvider>
        <WeeklyMenuProvider>
          <AppGate />
        </WeeklyMenuProvider>
      </ShoppingListProvider>
    </ProfileProvider>
  );
}

export function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading} accessibilityLabel="Cargando sesión">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
