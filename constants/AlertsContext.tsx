import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { FloodAlert, toFloodAlert } from './alerts';

const LAST_SEEN_KEY = 'floodsense_alerts_last_seen';
const MAX_ALERTS = 50;
const DISMISSED_KEY = 'floodsense_dismissed_alerts';
const MAX_DISMISSED = 300;

type AlertsContextType = {
  alerts: FloodAlert[];
  loading: boolean;
  error: string | null;
  /** Alerts newer than the last time the resident opened the notifications list. */
  unreadCount: number;
  markAllRead: () => void;
  /** Removes one alert from this phone only (other residents and the database are unaffected). */
  dismissAlert: (id: string) => void;
  /** Removes every alert currently shown from this phone only. */
  clearAll: () => void;
  refresh: () => Promise<void>;
};

const AlertsContext = createContext<AlertsContextType>({
  alerts: [],
  loading: true,
  error: null,
  unreadCount: 0,
  markAllRead: () => {},
  dismissAlert: () => {},
  clearAll: () => {},
  refresh: async () => {},
});

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<FloodAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // Alerts are only readable by signed-in residents (row level security), so follow the session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY)
      .then((value) => setLastSeen(value ? Number(value) || 0 : 0))
      .catch(() => {});
  }, []);

  // Alerts the resident deleted from this phone stay hidden after the app restarts.
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => {
        const ids = raw ? JSON.parse(raw) : [];
        if (Array.isArray(ids)) setDismissed(ids.filter((id) => typeof id === 'string'));
      })
      .catch(() => {})
      .finally(() => setDismissedLoaded(true));
  }, []);

  useEffect(() => {
    if (!dismissedLoaded) return;
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed)).catch(() => {});
  }, [dismissedLoaded, dismissed]);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('alerts')
      .select('id, type, title, message, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_ALERTS);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setAlerts((data ?? []).map(toFloodAlert).filter((a): a is FloodAlert => a !== null));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    refresh();

    // New alerts appear instantly while the app is open.
    const channel = supabase
      .channel('alerts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const alert = toFloodAlert(payload.new);
        if (!alert) return;
        setAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev].slice(0, MAX_ALERTS)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [signedIn, refresh]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setLastSeen(now);
    AsyncStorage.setItem(LAST_SEEN_KEY, String(now)).catch(() => {});
  }, []);

  const visibleAlerts = useMemo(() => {
    const hidden = new Set(dismissed);
    return alerts.filter((a) => !hidden.has(a.id));
  }, [alerts, dismissed]);

  const dismissAlert = useCallback((id: string) => {
    setDismissed((prev) => (prev.includes(id) ? prev : [id, ...prev].slice(0, MAX_DISMISSED)));
  }, []);

  const clearAll = useCallback(() => {
    setDismissed((prev) => Array.from(new Set([...alerts.map((a) => a.id), ...prev])).slice(0, MAX_DISMISSED));
  }, [alerts]);

  const unreadCount = useMemo(
    () => visibleAlerts.filter((a) => new Date(a.created_at).getTime() > lastSeen).length,
    [visibleAlerts, lastSeen]
  );

  const value = useMemo(
    () => ({ alerts: visibleAlerts, loading, error, unreadCount, markAllRead, dismissAlert, clearAll, refresh }),
    [visibleAlerts, loading, error, unreadCount, markAllRead, dismissAlert, clearAll, refresh]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  return useContext(AlertsContext);
}
