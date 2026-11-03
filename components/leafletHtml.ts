export type LatLng = { latitude: number; longitude: number };

export type LeafletLayerKey = 'street' | 'satellite' | 'terrain' | 'cycle' | 'transport';
export type LeafletIconName = 'home' | 'alert-triangle' | 'map-pin';

export type LeafletData = {
  /** Which map style to show. */
  layer: LeafletLayerKey;
  /** Circles drawn on the map (flood zones, evacuation areas). */
  circles: { center: LatLng; radius: number; color: string }[];
  /** Round icon pins with an optional text label under them. */
  markers: { coordinate: LatLng; color: string; icon: LeafletIconName; size: number; label?: string }[];
  /** Dashed navigation route. */
  route: LatLng[] | null;
  /** Points to fit in view. The map only refits when fitId changes. */
  fit: LatLng[];
  fitId: number;
};

export const INITIAL_CENTER: [number, number] = [14.455849726559434, 120.98338557152699];

type TileSource = { url: string; opacity?: number; subdomains?: string; attribution?: string };

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO = '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI = 'Tiles &copy; Esri';

// Every map style is drawn by Leaflet, so pins and circles are placed by exact map geometry
// and look and behave the same on iOS, Android and web.
export const LEAFLET_LAYERS: Record<LeafletLayerKey, TileSource[]> = {
  street: [{ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: OSM }],
  satellite: [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: ESRI + ', Maxar, Earthstar Geographics',
    },
  ],
  terrain: [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: ESRI,
    },
  ],
  cycle: [
    { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', subdomains: 'abcd', attribution: CARTO },
    { url: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', opacity: 0.8, attribution: '&copy; waymarkedtrails.org' },
  ],
  transport: [
    { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png', subdomains: 'abcd', attribution: CARTO },
  ],
};

// Feather icon shapes (same icons the rest of the app uses), drawn white on the coloured pin.
const ICON_SVG: Record<LeafletIconName, string> = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'alert-triangle':
    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
};

// Leaflet page shared by the native WebView and the web iframe.
export const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    /* Fixed-size canvas: the icon is at its exact centre, which is the map coordinate (iconAnchor = centre).
       The label is absolutely positioned, so its text can never move the icon. */
    .pin { position: relative; width: 96px; height: 84px; }
    .pin-dot { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-sizing: border-box;
      border-radius: 50%; border: 2px solid rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; }
    .pin-dot svg { fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .pin-label { position: absolute; left: 50%; transform: translateX(-50%); height: 14px; line-height: 14px; padding: 0 6px;
      border-radius: 4px; color: #fff; background: rgba(13,59,94,0.92); font: 800 8px sans-serif; letter-spacing: 0.5px; white-space: nowrap; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var LAYERS = ${JSON.stringify(LEAFLET_LAYERS)};
    var ICONS = ${JSON.stringify(ICON_SVG)};

    var map = L.map('map', { maxZoom: 19 }).setView(${JSON.stringify(INITIAL_CENTER)}, 16);
    var tileGroup = L.layerGroup().addTo(map);
    var overlay = L.layerGroup().addTo(map);
    var currentLayer = null;
    var lastFitId = null;

    function applyLayer(key) {
      if (key === currentLayer || !LAYERS[key]) return;
      currentLayer = key;
      tileGroup.clearLayers();
      LAYERS[key].forEach(function (t, i) {
        L.tileLayer(t.url, {
          maxZoom: 19,
          subdomains: t.subdomains || 'abc',
          opacity: t.opacity || 1,
          attribution: t.attribution || '',
          zIndex: i
        }).addTo(tileGroup);
      });
    }
    applyLayer('street');

    function post(msg) {
      var text = JSON.stringify(msg);
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
      else if (window.parent !== window) window.parent.postMessage(text, '*');
    }

    map.on('click', function () { post({ type: 'tap' }); });

    function ll(p) { return [p.latitude, p.longitude]; }

    // Re-measure whenever the container changes size (fullscreen, rotation) so fitBounds and tiles stay correct.
    window.addEventListener('resize', function () { map.invalidateSize(); });

    window.setData = function (data) {
      map.invalidateSize();
      applyLayer(data.layer);
      overlay.clearLayers();

      data.circles.forEach(function (c) {
        L.circle(ll(c.center), { radius: c.radius, color: c.color, weight: 2, fillColor: c.color, fillOpacity: 0.2, interactive: false }).addTo(overlay);
      });

      if (data.route) {
        L.polyline(data.route.map(ll), { color: '#2EC4B6', weight: 4, dashArray: '10 6', interactive: false }).addTo(overlay);
      }

      data.markers.forEach(function (m) {
        var iconSize = Math.round(m.size * 0.45);
        var svg = '<svg width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24">' + ICONS[m.icon] + '</svg>';
        var dot = '<div class="pin-dot" style="width:' + m.size + 'px;height:' + m.size + 'px;background:' + m.color + '">' + svg + '</div>';
        var label = m.label
          ? '<div class="pin-label" style="top:' + (42 + m.size / 2 + 3) + 'px">' + m.label + '</div>'
          : '';
        var icon = L.divIcon({ html: '<div class="pin">' + dot + label + '</div>', className: '', iconSize: [96, 84], iconAnchor: [48, 42] });
        L.marker(ll(m.coordinate), { icon: icon, interactive: false, keyboard: false }).addTo(overlay);
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
  layer: LeafletLayerKey;
  floods: LatLng[];
  floodRadius: number;
  evacAreas: { name: string; coordinate: LatLng }[];
  /** Draw an orange circle around each evacuation area. */
  evacCircleRadius?: number;
  evacPinSize?: number;
  evacLabel?: string;
  userLocation: LatLng | null;
  route: LatLng[] | null;
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
    coordinate: area.coordinate, color: '#f39c12', icon: 'home', size: a.evacPinSize ?? 30, label: a.evacLabel,
  }));
  if (a.userLocation) {
    markers.push({ coordinate: a.userLocation, color: '#2EC4B6', icon: 'map-pin', size: 36, label: 'YOU' });
  }
  a.floods.forEach((coordinate) =>
    markers.push({ coordinate, color: '#C0392B', icon: 'alert-triangle', size: 30, label: 'FLOOD ZONE' })
  );

  // Fit the route when there is one, otherwise the flood zones.
  const fit = a.route ?? a.floods.flatMap((f) => circleBounds(f, a.floodRadius));

  return { layer: a.layer, circles, markers, route: a.route, fit, fitId: a.fitId };
}
