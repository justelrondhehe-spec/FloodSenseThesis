import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LEAFLET_HTML, LeafletData } from './leafletHtml';

type Props = {
  data: LeafletData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// Web: Leaflet runs inside an iframe.
export default function LeafletMap({ data, style, onPress }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ready') setReady(true);
        else if (msg.type === 'tap') onPress?.();
      } catch {
        // ignore malformed messages
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onPress]);

  useEffect(() => {
    if (!ready) return;
    (frameRef.current?.contentWindow as any)?.setData(data);
  }, [ready, data]);

  return (
    <View style={[styles.container, style]}>
      {React.createElement('iframe', {
        ref: frameRef,
        srcDoc: LEAFLET_HTML,
        style: { border: 0, width: '100%', height: '100%' },
        title: 'Street map',
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});
