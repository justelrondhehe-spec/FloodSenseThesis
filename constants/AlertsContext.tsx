import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { FloodAlert, toFloodAlert } from './alerts';

const LAST_SEEN_KEY = 'floodsense_alerts_last_seen';
const MAX_ALERTS = 50;

type AlertsContextType = {
  alerts: FloodAlert[];
  loading: boolean;
  error: string | null;
  /** Alerts newer than the last time the resident opened the notifications list. */
  unreadCount: number;
  markAllRead: () => void;
  refresh: () => Promise<void>;
};

const AlertsContext = createContext<AlertsContextType>({
  alerts: [],
  loading: true,
  error: null,
  unreadCount: 0,
  markAllRead: () => {},
  refresh: async () => {},
});

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<FloodAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(0);
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

  const unreadCount = useMemo(
    () => alerts.filter((a) => new Date(a.created_at).getTime() > lastSeen).length,
    [alerts, lastSeen]
  );

  const value = useMemo(
    () => ({ alerts, loading, error, unreadCount, markAllRead, refresh }),
    [alerts, loading, error, unreadCount, markAllRead, refresh]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  return useContext(AlertsContext);
}
