import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Marker } from './MapPrimitives';
import type { Coordinate } from '../constants/routing';

// The pin is drawn on a fixed-size canvas. The icon is placed at the exact centre of the canvas,
// and the canvas centre is the map coordinate (anchor 0.5/0.5). The label is absolutely positioned
// below the icon, so its text size can never shift the icon off the coordinate.
const CANVAS_WIDTH = 96;
const CANVAS_HEIGHT = 84;
const LABEL_GAP = 3;
const LABEL_HEIGHT = 14;

type Props = {
  coordinate: Coordinate;
  color: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  /** Diameter of the round icon badge. */
  size?: number;
  iconSize?: number;
  label?: string;
  labelColor?: string;
};

export default function PinMarker({
  coordinate, color, icon, size = 32, iconSize = 14, label, labelColor = 'rgba(13,59,94,0.92)',
}: Props) {
  // Let the map snapshot the pin once its icon font has rendered, then stop tracking (better performance).
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setTracking(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracking}>
      <View style={styles.canvas}>
        <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
          <Feather name={icon} size={iconSize} color="#fff" />
        </View>
        {label ? (
          <View style={[styles.label, { top: CANVAS_HEIGHT / 2 + size / 2 + LABEL_GAP, backgroundColor: labelColor }]}>
            <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  label: {
    position: 'absolute',
    height: LABEL_HEIGHT,
    paddingHorizontal: 6,
    borderRadius: 4,
    justifyContent: 'center',
  },
  labelText: { fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});
