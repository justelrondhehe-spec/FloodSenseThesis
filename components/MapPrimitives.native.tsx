import React, { forwardRef } from 'react';
import MapView, { Circle, Marker, Polyline, UrlTile, type MapViewProps } from 'react-native-maps';

export const MapSurface = forwardRef<MapView, MapViewProps>((props, ref) => (
  <MapView ref={ref} {...props} />
));

MapSurface.displayName = 'MapSurface';

export { Circle, Marker, Polyline, UrlTile };
