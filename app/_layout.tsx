import React, { useEffect, useRef } from 'react';
import { Stack, router, usePathname, useRootNavigationState, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../constants/ThemeContext';
import { View } from 'react-native';
import { supabase } from '../constants/supabase';
import { AlertsProvider } from '../constants/AlertsContext';
import { autoRegisterPushNotifications } from '../constants/notifications';
import { getResident, isProfileComplete } from '../constants/residents';

function AppContent() {
  const { darkMode } = useTheme();
  const navigationState = useRootNavigationState();
  const navigationReady = !!navigationState?.key;
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    // Redirecting before the navigator mounts throws, so wait until it is ready.
    if (!navigationReady) return;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Signed in: make sure this phone can receive flood alerts. Deferred because Supabase must
        // not be called from inside this callback.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setTimeout(autoRegisterPushNotifications, 0);
        }
        // App opened while signed in: a resident who never finished their profile goes back to finish it.
        // (Only on startup; during login the login screen manages this itself.)
        if (event === 'INITIAL_SESSION') {
          const userId = session.user.id;
          setTimeout(async () => {
            try {
              if (!isProfileComplete(await getResident(userId))) router.replace('/(auth)/login' as Href);
            } catch {
              // offline or table unavailable: let the resident in rather than lock them out
            }
          }, 0);
        }
        return;
      }

      // The email-confirmation screen signs the resident in itself; don't redirect away while it works.
      if (pathnameRef.current.startsWith('/auth/callback')) return;

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
      <AlertsProvider>
        <AppContent />
      </AlertsProvider>
    </ThemeProvider>
  );
}

