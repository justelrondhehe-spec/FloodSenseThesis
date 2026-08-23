import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../constants/ThemeContext';
import { View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../constants/firebase';

function AppContent() {
  const { darkMode } = useTheme();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/(auth)');
    });
    return unsub;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#0a1628' : '#fff' }}>
      <StatusBar style={darkMode ? 'light' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
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

