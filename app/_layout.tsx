import React, { useEffect } from 'react';
import { Stack, router, useRootNavigationState, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../constants/ThemeContext';
import { View } from 'react-native';
import { supabase } from '../constants/supabase';

function AppContent() {
  const { darkMode } = useTheme();
  const navigationState = useRootNavigationState();
  const navigationReady = !!navigationState?.key;

  useEffect(() => {
    // Redirecting before the navigator mounts throws, so wait until it is ready.
    if (!navigationReady) return;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) return;

      router.replace('/(auth)/login' as Href);
    });
    return () => data.subscription.unsubscribe();
  }, [navigationReady]);

  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#0a1628' : '#fff' }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

