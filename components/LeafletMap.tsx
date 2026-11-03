import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LEAFLET_HTML, LeafletData } from './leafletHtml';

type Props = {
  data: LeafletData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// Native (iOS/Android): Leaflet runs inside a WebView.
export default function LeafletMap({ data, style, onPress }: Props) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    webRef.current?.injectJavaScript(`window.setData(${JSON.stringify(data)}); true;`);
  }, [ready, data]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') setReady(true);
      else if (msg.type === 'tap') onPress?.();
    } catch {
      // ignore malformed messages
    }
  };

  return (
    // WebView<{}>: react-native-webview 14 defaults its generic to `undefined`, which makes every prop `never`.
    <WebView<{}>
      ref={webRef}
      style={style}
      // baseUrl gives OpenStreetMap tile requests a valid referer.
      source={{ html: LEAFLET_HTML, baseUrl: 'https://floodsense.app' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      onLoadStart={() => setReady(false)}
      nestedScrollEnabled
      overScrollMode="never"
    />
  );
}
