import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { navigationTheme } from '../presentation/theme/navigationTheme';
import { RootNavigator } from '../presentation/navigation/RootNavigator';
import { AuthProvider } from './providers/AuthProvider';
import { AppErrorBoundary } from './providers/AppErrorBoundary';

void SplashScreen.preventAutoHideAsync();

function AppContent() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

export function AppRoot() {
  const [fontsLoaded, fontError] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContent />
    </GestureHandlerRootView>
  );
}
