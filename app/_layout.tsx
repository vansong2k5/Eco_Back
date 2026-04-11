import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useAuthStore } from '../src/store/auth.store';
import { Colors } from '../src/constants/colors';

const EcoTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.white,
    text: Colors.textPrimary,
    border: Colors.border,
  },
};

function RootLayoutNav() {
  const { user, profile, isInitialized } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    // Đợi profile load xong nếu có user
    if (user && !profile) return;

    const inAuthGroup = ['login', 'register', 'forgot-password'].includes(segments[0] ?? '');
    const inTabsGroup = segments[0] === '(tabs)';
    const inAdminGroup = segments[0] === '(admin)';
    
    const isAdmin = profile?.role === 'ADMIN';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user) {
      if (isAdmin) {
        // Nếu là Admin nhưng đang ở trang Auth hoặc Tab User -> điều hướng về Admin
        if (inAuthGroup || inTabsGroup) {
          router.replace('/(admin)');
        }
      } else {
        // Nếu là User thường nhưng đang ở Auth hoặc Admin -> điều hướng về User Tabs
        if (inAuthGroup || inAdminGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, profile, isInitialized, segments]);

  // Show branded loading screen instead of blank white screen
  if (!isInitialized || (user && !profile)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-request" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, []);

  const body = (
    <ThemeProvider value={EcoTheme}>
      <RootLayoutNav />
      <StatusBar style="light" />
    </ThemeProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F7F6' }}>
        <View style={{ 
          flex: 1, width: '100%', maxWidth: 1200, marginHorizontal: 'auto',
          backgroundColor: Colors.background, 
          shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 20,
        }}>
          {body}
        </View>
      </View>
    );
  }

  return body;
}
