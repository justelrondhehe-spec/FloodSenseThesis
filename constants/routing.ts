export type Coordinate = { latitude: number; longitude: number };
export type EvacPoint = { name: string; coordinate: Coordinate };

export type EvacRoute = {
  /** Points along the path, from the user to the evacuation area. */
  coords: Coordinate[];
  /** Distance in km. */
  distance: number;
  /** Walking time in minutes. */
  time: number;
  name: string;
  /** True when walking directions were unavailable and the line is a straight-line estimate. */
  estimated: boolean;
  /** True when the path was routed around the flood zones. */
  avoidsFlood: boolean;
  /** True when the path still passes through a flood zone (no dry path exists). */
  crossesFlood: boolean;
};

// Free pedestrian routing on OpenStreetMap data (no API key, fair-use limits).
// Valhalla is used because it can exclude areas, so routes can steer around flood zones.
const ROUTER_URL = 'https://valhalla1.openstreetmap.de/route';
const ROUTER_TIMEOUT_MS = 10000;
const WALK_MINUTES_PER_KM = 12; // 5 km/h, used only for the straight-line fallback
const AVOID_MARGIN = 1.05; // exclusion polygons are slightly larger than the drawn circles

/** Straight-line (haversine) distance in km. */
export const getDistance = (a: Coordinate, b: Coordinate) => {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** Decodes Valhalla's encoded polyline (6 decimal places). */
function decodePolyline6(encoded: string): Coordinate[] {
  const points: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ['lat', 'lng'] as const) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += delta;
      else lng += delta;
    }
    points.push({ latitude: lat / 1e6, longitude: lng / 1e6 });
  }
  return points;
}

/** A polygon (lng/lat ring) approximating a circle, for Valhalla's exclude_polygons. */
function circleRing(center: Coordinate, radiusMeters: number, sides = 32): [number, number][] {
  const ring: [number, number][] = [];
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    ring.push([
      center.longitude + (radiusMeters * Math.sin(angle)) / (111320 * cosLat),
      center.latitude + (radiusMeters * Math.cos(angle)) / 111320,
    ]);
  }
  ring.push(ring[0]);
  return ring;
}

/** Whether any part of the path (not just its vertices) enters one of the circles. */
function pathCrossesFlood(coords: Coordinate[], floods: Coordinate[], radiusMeters: number) {
  const STEP_METERS = 10;
  const isFlooded = (p: Coordinate) => floods.some((f) => getDistance(p, f) * 1000 < radiusMeters);
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const steps = Math.max(1, Math.ceil((getDistance(a, b) * 1000) / STEP_METERS));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      if (isFlooded({
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      })) return true;
    }
  }
  return false;
}

type Leg = { coords: Coordinate[]; distance: number; time: number };

/** Walking route from `from` to `to`, or null when none exists (or the service fails). */
async function fetchWalkingRoute(
  from: Coordinate,
  to: Coordinate,
  avoid: { center: Coordinate; radius: number }[]
): Promise<Leg | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTER_TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = {
      locations: [
        { lat: from.latitude, lon: from.longitude },
        { lat: to.latitude, lon: to.longitude },
      ],
      costing: 'pedestrian',
    };
    if (avoid.length > 0) {
      body.exclude_polygons = avoid.map((a) => circleRing(a.center, a.radius * AVOID_MARGIN));
    }

    const res = await fetch(ROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null; // 400 "No path could be found" or a service error

    const json = await res.json();
    const leg = json?.trip?.legs?.[0];
    if (!leg?.shape) return null;

    const path = decodePolyline6(leg.shape);
    return {
      // The router snaps to the nearest street, so join the line to the exact start and end points.
      coords: [from, ...path, to],
      distance: json.trip.summary.length, // km
      time: Math.max(1, Math.ceil(json.trip.summary.time / 60)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function shortestLeg(
  from: Coordinate,
  areas: EvacPoint[],
  avoid: { center: Coordinate; radius: number }[]
) {
  const legs = await Promise.all(
    areas.map(async (area) => ({ area, leg: await fetchWalkingRoute(from, area.coordinate, avoid) }))
  );
  let best: { area: EvacPoint; leg: Leg } | null = null;
  for (const item of legs) {
    if (item.leg && (!best || item.leg.distance < best.leg.distance)) {
      best = { area: item.area, leg: item.leg };
    }
  }
  return best;
}

/**
 * Finds the evacuation area with the shortest walking route, steering around flood zones.
 * Flood zones the user is already standing in are not excluded, so they can always walk out.
 * If no dry route exists, the shortest route is returned with `crossesFlood` set.
 */
export async function findEvacuationRoute(
  from: Coordinate,
  areas: EvacPoint[],
  floods: Coordinate[],
  floodRadiusMeters: number
): Promise<EvacRoute> {
  const zonesToAvoid = floods.filter((f) => getDistance(from, f) * 1000 > floodRadiusMeters);
  const avoid = zonesToAvoid.map((center) => ({ center, radius: floodRadiusMeters }));

  // 1) Dry route: avoid the flood zones.
  let best = avoid.length > 0 ? await shortestLeg(from, areas, avoid) : null;
  let avoidsFlood = best !== null;

  // 2) No dry route (or nothing to avoid): shortest route, even through flooded streets.
  if (!best) {
    best = await shortestLeg(from, areas, []);
    avoidsFlood = false;
  }

  if (best) {
    return {
      ...best.leg,
      name: best.area.name,
      estimated: false,
      avoidsFlood,
      crossesFlood: pathCrossesFlood(best.leg.coords, zonesToAvoid, floodRadiusMeters),
    };
  }

  // 3) Offline or the service is down: straight line to the nearest area.
  const nearest = [...areas].sort(
    (a, b) => getDistance(from, a.coordinate) - getDistance(from, b.coordinate)
  )[0];
  const distance = getDistance(from, nearest.coordinate);
  const coords = [from, nearest.coordinate];
  return {
    coords,
    distance,
    time: Math.max(1, Math.ceil(distance * WALK_MINUTES_PER_KM)),
    name: nearest.name,
    estimated: true,
    avoidsFlood: false,
    crossesFlood: pathCrossesFlood(coords, zonesToAvoid, floodRadiusMeters),
  };
}
