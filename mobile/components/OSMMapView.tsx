import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type MapMarker = { lat: number; lng: number; title?: string };

type OSMMapViewProps = {
  center: { lat: number; lng: number };
  markers?: MapMarker[];
  zoom?: number;
  style?: { width?: string | number; height: number };
};

/**
 * Renders an OpenStreetMap (Leaflet) map in a WebView. No Google API key needed.
 * Use for Ride and Parcel when native Google Maps is disabled to avoid crashes.
 */
export function OSMMapView({ center, markers = [], zoom = 14, style }: OSMMapViewProps) {
  const html = useMemo(() => {
    const markersJson = JSON.stringify(markers);
    const centerJson = JSON.stringify([center.lat, center.lng]);
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
  <style>body{margin:0;padding:0;} #map{width:100%;height:100%;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    var center = ${centerJson};
    var markersData = ${markersJson};
    var map = L.map('map', { zoomControl: true }).setView(center, ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    var layer = L.layerGroup();
    markersData.forEach(function(m) {
      L.marker([m.lat, m.lng]).addTo(layer).bindPopup(m.title || '');
    });
    layer.addTo(map);
    if (markersData.length >= 2) {
      var bounds = L.latLngBounds(markersData.map(function(m) { return [m.lat, m.lng]; }));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  </script>
</body>
</html>`;
  }, [center.lat, center.lng, markers, zoom]);

  const height = style?.height ?? 280;

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html }}
        style={[styles.webview, { height }]}
        scrollEnabled={false}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        javaScriptEnabled
        domStorageEnabled
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
  },
  webview: {
    width: '100%',
    backgroundColor: 'transparent',
  },
});
