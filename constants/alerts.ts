import type { ComponentProps } from 'react';
import type { Feather } from '@expo/vector-icons';
import { Colors } from './theme';

export type AlertType = 'warning' | 'info' | 'safe' | 'notice';

export type FloodAlert = {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  created_at: string;
};

const ALERT_TYPES: AlertType[] = ['warning', 'info', 'safe', 'notice'];

/** Guards against rows with an unexpected shape (for example from the website). */
export function toFloodAlert(row: any): FloodAlert | null {
  if (!row?.id || !row.title || !row.message || !row.created_at) return null;
  return {
    id: String(row.id),
    type: ALERT_TYPES.includes(row.type) ? row.type : 'notice',
    title: String(row.title),
    message: String(row.message),
    created_at: String(row.created_at),
  };
}

/** "Just now", "15 mins ago", "3 hours ago", "2 days ago", then a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

/** Icon and colour used for each alert type, shared by the home list and the notifications sheet. */
export const ALERT_APPEARANCE: Record<AlertType, { icon: ComponentProps<typeof Feather>['name']; color: string }> = {
  warning: { icon: 'alert-triangle', color: Colors.orange },
  info: { icon: 'info', color: Colors.teal },
  safe: { icon: 'check-circle', color: Colors.green },
  notice: { icon: 'bell', color: Colors.navyLight },
};
