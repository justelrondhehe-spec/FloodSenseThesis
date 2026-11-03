import * as Linking from 'expo-linking';
import { supabase } from './supabase';

export const AUTH_CALLBACK_PATH = 'auth/callback';

/**
 * Where the confirmation email sends the resident after they tap the link: back into this app
 * (floodsense://auth/callback in a real build, exp://... while testing in Expo Go).
 * This URL must be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs,
 * otherwise Supabase falls back to the project's Site URL (the website).
 */
export const getEmailRedirectUrl = () => Linking.createURL(AUTH_CALLBACK_PATH);

function readParams(url: string): URLSearchParams {
  // Supabase returns tokens in the URL fragment (#access_token=...) and errors in either place.
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.split('?')[1] : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
  return params;
}

/**
 * Signs the resident in from the link in their confirmation email.
 * Returns false when the URL carries no session (for example the screen was opened by hand).
 * Throws with Supabase's message when the link is expired or invalid.
 */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  const params = readParams(url);

  const errorDescription = params.get('error_description');
  if (errorDescription) throw new Error(errorDescription.replace(/\+/g, ' '));

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  return true;
}
