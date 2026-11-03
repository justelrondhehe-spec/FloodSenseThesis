import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { createSessionFromUrl } from '../../constants/authLinks';

// Opened by the link in the confirmation email (floodsense://auth/callback#access_token=...).
// Signs the resident in, then hands over to the login screen, which sends them to the profile
// step (new resident) or the home tab (profile already complete).
export default function AuthCallback() {
  const url = Linking.useURL();
  const [message, setMessage] = useState('Confirming your email…');

  useEffect(() => {
    let cancelled = false;
    const goToLogin = () => {
      if (!cancelled) router.replace('/(auth)/login' as Href);
    };

    // If no link ever arrives (screen opened by hand), don't leave the resident stuck here.
    const fallback = setTimeout(goToLogin, 4000);

    if (url) {
      clearTimeout(fallback);
      createSessionFromUrl(url)
        .then((signedIn) => {
          if (!signedIn) return goToLogin();
          setMessage('Email confirmed!');
          goToLogin();
        })
        .catch((error: Error) => {
          Alert.alert('Link Problem', `${error.message}\n\nPlease log in, or sign up again to get a new link.`);
          goToLogin();
        });
    }

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2EC4B6" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#FFFFFF' },
  text: { fontSize: 16, color: '#0D3B5E', fontWeight: '600' },
});
