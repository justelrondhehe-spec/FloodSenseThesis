import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const TOKEN_KEY = 'floodsense_push_token';
const OPT_OUT_KEY = 'floodsense_push_opt_out';
const CHANNEL_ID = 'flood-alerts';

// Show alerts as a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Asks for permission, gets this phone's Expo push token, and saves it to Supabase so the
 * database can push flood alerts to it. Safe to call repeatedly; never throws.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Push needs a real phone; web has no Expo push support.
    if (Platform.OS === 'web' || !Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Flood alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2EC4B6',
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    // The EAS project id is created by `eas init` / `eas build:configure` and stored in app.json.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Push notifications: no EAS projectId yet. Run `eas init` to create one.');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (error) throw error;

    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.removeItem(OPT_OUT_KEY);
    return token;
  } catch (error) {
    console.warn('Push notification registration failed:', error);
    return null;
  }
}

/** Registers automatically after login unless the resident turned alerts off in settings. */
export async function autoRegisterPushNotifications() {
  try {
    if ((await AsyncStorage.getItem(OPT_OUT_KEY)) === 'true') return;
  } catch {
    // fall through and register
  }
  await registerForPushNotifications();
}

/**
 * Stops this phone from receiving alerts (call before signing out, while still authenticated).
 * Pass `optOut` when the resident switches alerts off, so they stay off on the next launch.
 */
export async function unregisterPushNotifications(optOut = false) {
  try {
    if (optOut) await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('token', token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Push notification unregister failed:', error);
  }
}

/** Whether this phone is currently registered to receive alerts. */
export async function hasPushRegistration() {
  try {
    return (await AsyncStorage.getItem(TOKEN_KEY)) !== null;
  } catch {
    return false;
  }
}
