import * as Linking from 'expo-linking';

export const AUTH_CALLBACK_PATH = 'auth/callback';

/**
 * Where the confirmation email sends the resident after they tap the link: back into this app
 * (floodsense://auth/callback in a real build, exp://... while testing in Expo Go).
 * This URL must be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs,
 * otherwise Supabase falls back to the project's Site URL (the website).
 */
export const getEmailRedirectUrl = () => Linking.createURL(AUTH_CALLBACK_PATH);

/**
 * Reads the result Supabase attached to the link it redirected to.
 * Supabase confirms the email on its own server before redirecting, so success needs no further work here;
 * an expired or already-used link comes back as an error in the URL.
 */
export function readConfirmationResult(url: string): { ok: true } | { ok: false; message: string } {
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.split('?')[1] : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => params.set(key, value));

  const description = params.get('error_description');
  if (description) return { ok: false, message: description.replace(/\+/g, ' ') };
  if (params.get('error')) return { ok: false, message: 'This confirmation link is not valid.' };
  return { ok: true };
}
