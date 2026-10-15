import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function MapSurface({ children, style }: any) {
  return (
    <View style={[styles.surface, style]}>
      <Text style={styles.title}>Map preview is available in the iOS or Android app.</Text>
      {children}
    </View>
  );
}

export function Circle() { return null; }
export function Marker() { return null; }
export function Polyline() { return null; }
export function UrlTile() { return null; }

const styles = StyleSheet.create({
  surface: {
    backgroundColor: '#dbecef',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#0d3b5e',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
