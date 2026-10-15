import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bgnqqjaipcckqgzzdtxy.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = SUPABASE_ANON_KEY !== '';

if (!isSupabaseConfigured) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Add it to .env and restart with: npx expo start --clear'
  );
}

// createClient throws on an empty key, which would crash every route at import time.
// A placeholder keeps the app loading; Supabase requests simply fail until the key is set.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'missing-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the login token while the app is in the foreground.
if (isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
