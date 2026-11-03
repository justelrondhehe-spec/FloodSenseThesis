// Live water-level sensors from the FloodSense website's Supabase project.
// Reads through the public_sensor_levels() function (see the website repo, migration
// 20261028000000_public_sensor_levels.sql); residents can't read the sensors table directly.
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface LiveSensor {
  id: string;
  name: string;
  location: string;
  type: string;
  reading: number | null;
  unit: string;
  warnLevel: number;
  dangerLevel: number;
  latitude: number | null;
  longitude: number | null;
  /** Reported within the last 2 minutes (same rule as the website). */
  online: boolean;
}

const OFFLINE_AFTER_SECONDS = 120;
const REFRESH_MS = 10_000;

interface SensorRow {
  id: string;
  name: string;
  location: string;
  type: string;
  reading: number | null;
  unit: string;
  warn_level: number;
  danger_level: number;
  lat: number | null;
  lng: number | null;
  age_seconds: number | null;
}

function toSensor(r: SensorRow): LiveSensor {
  return {
    id: r.id,
    name: r.name,
    location: r.location,
    type: r.type,
    reading: r.reading === null ? null : Number(r.reading),
    unit: r.unit,
    warnLevel: Number(r.warn_level),
    dangerLevel: Number(r.danger_level),
    latitude: typeof r.lat === 'number' ? r.lat : null,
    longitude: typeof r.lng === 'number' ? r.lng : null,
    online: r.age_seconds !== null && r.age_seconds <= OFFLINE_AFTER_SECONDS,
  };
}

/** Sensor list, refreshed every few seconds. `loaded` turns true after the first attempt. */
export function useLiveSensors() {
  const [sensors, setSensors] = useState<LiveSensor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc('public_sensor_levels');
      if (cancelled) return;
      if (error) console.warn('Could not load sensors:', error.message);
      else if (data) setSensors((data as SensorRow[]).map(toSensor));
      setLoaded(true);
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { sensors, loaded };
}

/**
 * The sensor to show on the Home screen: of the water sensors that are reporting, the one closest to
 * (or furthest past) its warning level, so the app always shows the worst current situation.
 */
export function pickWorstSensor(sensors: LiveSensor[]): LiveSensor | null {
  const live = sensors.filter((s) => s.type === 'water' && s.online && s.reading !== null);
  if (live.length === 0) return null;
  return live.reduce((worst, s) =>
    (s.reading as number) / s.warnLevel > (worst.reading as number) / worst.warnLevel ? s : worst,
  );
}
