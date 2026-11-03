import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import { readConfirmationResult } from '../../constants/authLinks';

const REDIRECT_DELAY_MS = 2500;
const NO_LINK_TIMEOUT_MS = 4000;

type Result = { status: 'checking' } | { status: 'verified' } | { status: 'failed'; message: string };

// Opened by the link in the confirmation email (floodsense://auth/callback).
// Shows "Email verified", then returns the resident to the app's login screen.
export default function AuthCallback() {
  const url = Linking.useURL();
  const [result, setResult] = useState<Result>({ status: 'checking' });

  const goToLogin = (verified: boolean) =>
    router.replace((verified ? '/(auth)/login?verified=1' : '/(auth)/login') as Href);

  useEffect(() => {
    if (url) {
      const outcome = readConfirmationResult(url);
      setResult(outcome.ok ? { status: 'verified' } : { status: 'failed', message: outcome.message });
      return;
    }
    // Opened by hand with no link: don't leave the resident stuck on this screen.
    const timer = setTimeout(() => goToLogin(false), NO_LINK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (result.status !== 'verified') return;
    const timer = setTimeout(() => goToLogin(true), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [result.status]);

  return (
    <View style={styles.container}>
      {result.status === 'checking' && (
        <>
          <ActivityIndicator size="large" color="#2EC4B6" />
          <Text style={styles.title}>Confirming your email…</Text>
        </>
      )}

      {result.status === 'verified' && (
        <>
          <View style={[styles.badge, { backgroundColor: '#2EC4B6' }]}>
            <Feather name="check" size={44} color="#fff" />
          </View>
          <Text style={styles.title}>Email verified</Text>
          <Text style={styles.subtitle}>Taking you back to log in…</Text>
          <TouchableOpacity style={styles.button} onPress={() => goToLogin(true)}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </>
      )}

      {result.status === 'failed' && (
        <>
          <View style={[styles.badge, { backgroundColor: '#C0392B' }]}>
            <Feather name="x" size={44} color="#fff" />
          </View>
          <Text style={styles.title}>Link problem</Text>
          <Text style={styles.subtitle}>{result.message}</Text>
          <Text style={styles.subtitle}>Log in, or sign up again to get a new link.</Text>
          <TouchableOpacity style={styles.button} onPress={() => goToLogin(false)}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, backgroundColor: '#FFFFFF' },
  badge: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#0D3B5E', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center' },
  button: { marginTop: 16, backgroundColor: '#2EC4B6', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 32 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
