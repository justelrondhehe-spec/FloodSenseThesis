import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';

export type NotificationType = 'warning' | 'info' | 'safe' | 'notice';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
};

const LIMIT = 50;
const LAST_SEEN_KEY = 'notifications_last_seen';
let channelCount = 0;

type Row = { id: string; type: string; title: string; message: string; created_at: string };

const fromRow = (r: Row): AppNotification => ({
  id: r.id,
  type: (['warning', 'info', 'safe', 'notice'].includes(r.type) ? r.type : 'notice') as NotificationType,
  title: r.title,
  message: r.message,
  createdAt: r.created_at,
});

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** Loads notifications from Supabase and keeps them live via Realtime. */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(LAST_SEEN_KEY).then(setLastSeen).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (error) {
        console.warn('Failed to load notifications:', error.message);
        return;
      }
      if (active) setNotifications((data as Row[]).map(fromRow));
    };
    load();

    // Unique per hook instance: supabase.channel() returns the existing channel for a repeated name,
    // and listeners can't be added after subscribe() (AppHeader and the Home screen both use this hook).
    const channel = supabase
      .channel(`notifications-feed-${++channelCount}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = fromRow(payload.new as Row);
        setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, LIMIT)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setNotifications((prev) => prev.filter((p) => p.id !== id));
      })
      // Re-fetch after a dropped connection so nothing posted in the gap is missed.
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') load();
      });

    // Refresh the "x mins ago" labels.
    const timer = setInterval(() => setTick((t) => t + 1), 60000);

    return () => {
      active = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !lastSeen || n.createdAt > lastSeen).length;

  // Use the newest notification's server timestamp so device clock drift can't hide new ones.
  const markAllRead = useCallback(() => {
    const newest = notifications[0]?.createdAt;
    if (!newest) return;
    setLastSeen(newest);
    AsyncStorage.setItem(LAST_SEEN_KEY, newest).catch(() => {});
  }, [notifications]);

  return { notifications, unreadCount, markAllRead };
}
