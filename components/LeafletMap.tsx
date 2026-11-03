import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import { LEAFLET_HTML, LeafletData } from './leafletHtml';

type Props = {
  data: LeafletData;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// react-native-webview 14's class typings don't match the React 19.3 JSX types, so JSX props resolve to `never`.
// Runtime is unaffected; this only relaxes the compile-time check for this one component.
const WebView = RNWebView as unknown as React.ComponentType<any>;

// Native (iOS/Android): Leaflet runs inside a WebView.
export default function LeafletMap({ data, style, onPress }: Props) {
  const webRef = useRef<RNWebView>(null);
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
    <WebView
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
