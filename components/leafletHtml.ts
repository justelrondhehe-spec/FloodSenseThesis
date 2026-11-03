export type LatLng = { latitude: number; longitude: number };

export type LeafletData = {
  /** Circles drawn on the map (flood zones, evacuation areas). */
  circles: { center: LatLng; radius: number; color: string }[];
  /** Pins with an optional text label under them. */
  markers: { coordinate: LatLng; color: string; icon: string; label?: string }[];
  /** Dashed navigation route. */
  route: LatLng[] | null;
  /** Points to fit in view. The map only refits when fitId changes. */
  fit: LatLng[];
  fitId: number;
};

export const INITIAL_CENTER: [number, number] = [14.455849726559434, 120.98338557152699];

// Leaflet page shared by the native WebView and the web iframe.
// Same setup as the Leaflet quick start: L.map + OpenStreetMap tile layer + markers.
export const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin { display: flex; flex-direction: column; align-items: center; }
    .pin-dot { width: 26px; height: 26px; border-radius: 13px; border: 2px solid rgba(255,255,255,0.8);
      display: flex; align-items: center; justify-content: center; color: #fff; font: 700 13px sans-serif; }
    .pin-label { margin-top: 2px; padding: 1px 5px; border-radius: 4px; color: #fff; background: rgba(13,59,94,0.9);
      font: 800 8px sans-serif; letter-spacing: 0.5px; white-space: nowrap; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView(${JSON.stringify(INITIAL_CENTER)}, 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var overlay = L.layerGroup().addTo(map);
    var lastFitId = null;

    function post(msg) {
      var text = JSON.stringify(msg);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
      else if (window.parent !== window) window.parent.postMessage(text, '*');
    }

    map.on('click', function () { post({ type: 'tap' }); });

    function ll(p) { return [p.latitude, p.longitude]; }

    window.setData = function (data) {
      overlay.clearLayers();

      data.circles.forEach(function (c) {
        L.circle(ll(c.center), { radius: c.radius, color: c.color, weight: 2, fillColor: c.color, fillOpacity: 0.2 }).addTo(overlay);
      });

      if (data.route) {
        L.polyline(data.route.map(ll), { color: '#2EC4B6', weight: 4, dashArray: '10 6' }).addTo(overlay);
      }

      data.markers.forEach(function (m) {
        var html = '<div class="pin"><div class="pin-dot" style="background:' + m.color + '">' + m.icon + '</div>' +
          (m.label ? '<div class="pin-label">' + m.label + '</div>' : '') + '</div>';
        var icon = L.divIcon({ html: html, className: '', iconSize: [60, 44], iconAnchor: [30, 13] });
        L.marker(ll(m.coordinate), { icon: icon }).addTo(overlay);
      });

      if (data.fitId !== lastFitId && data.fit.length > 0) {
        lastFitId = data.fitId;
        map.fitBounds(L.latLngBounds(data.fit.map(ll)), { padding: [40, 40], animate: false, maxZoom: 18 });
      }
    };

    // Tell the host the page is ready to receive data.
    post({ type: 'ready' });
  </script>
</body>
</html>`;

type BuildArgs = {
  floods: LatLng[];
  floodRadius: number;
  evacAreas: { name: string; coordinate: LatLng }[];
  /** Draw an orange circle around each evacuation area. */
  evacCircleRadius?: number;
  evacLabel?: string;
  userLocation: LatLng | null;
  route: LatLng[] | null;
  drrmOffice?: LatLng;
  fitId: number;
};

// Corners of a box that contains a circle of `radius` metres around `p`.
const circleBounds = (p: LatLng, radius: number): LatLng[] => {
  const dLat = radius / 111320;
  const dLng = radius / (111320 * Math.cos((p.latitude * Math.PI) / 180));
  return [
    { latitude: p.latitude - dLat, longitude: p.longitude - dLng },
    { latitude: p.latitude + dLat, longitude: p.longitude + dLng },
  ];
};

export function buildLeafletData(a: BuildArgs): LeafletData {
  const circles: LeafletData['circles'] = a.floods.map((center) => ({
    center, radius: a.floodRadius, color: '#E74C3C',
  }));
  if (a.evacCircleRadius) {
    a.evacAreas.forEach((area) =>
      circles.push({ center: area.coordinate, radius: a.evacCircleRadius!, color: '#FFA500' })
    );
  }

  const markers: LeafletData['markers'] = a.evacAreas.map((area) => ({
    coordinate: area.coordinate, color: '#f39c12', icon: '⌂', label: a.evacLabel,
  }));
  if (a.userLocation) markers.push({ coordinate: a.userLocation, color: '#2EC4B6', icon: '●', label: 'YOU' });
  a.floods.forEach((coordinate) => markers.push({ coordinate, color: '#C0392B', icon: '!', label: 'FLOOD ZONE' }));
  if (a.drrmOffice) markers.push({ coordinate: a.drrmOffice, color: '#1B4F72', icon: '★', label: 'DRRM' });

  // Fit the route when there is one, otherwise the flood zones.
  const fit = a.route ?? a.floods.flatMap((f) => circleBounds(f, a.floodRadius));

  return { circles, markers, route: a.route, fit, fitId: a.fitId };
}
