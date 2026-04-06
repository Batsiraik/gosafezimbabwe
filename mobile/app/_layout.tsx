import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  setupAndroidNotificationChannel,
  addNotificationResponseListener,
} from '@/lib/push-notifications';

const APP_BG = 'rgb(120, 90, 12)';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.error('Root layout error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const err = this.state.error;
      const stack = err.stack || '';
      return (
        <View style={styles.errorRoot}>
          <ScrollView style={styles.errorScroll} contentContainerStyle={styles.errorScrollContent}>
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{err.message}</Text>
            {__DEV__ && stack ? (
              <Text style={styles.errorStack} selectable>
                {stack}
              </Text>
            ) : null}
            <Text style={styles.errorHint}>
              If the app closed completely, the crash may be in native code. Run in a terminal:{'\n'}
              adb logcat *:E
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const responseListenerRef = useRef<ReturnType<typeof addNotificationResponseListener> | null>(null);

  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  useEffect(() => {
    responseListenerRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      const type = data?.type;
      if (type === 'new_ride_request' || type === 'ride_bid_accepted') {
        router.replace('/driver/taxi/dashboard');
      } else if (type === 'new_parcel_request' || type === 'parcel_bid_accepted') {
        router.replace('/driver/parcel/dashboard');
      } else if (type === 'new_service_request' || type === 'service_bid_accepted') {
        router.replace('/driver/home-services/dashboard');
      } else if (type === 'city_to_city_match') {
        router.replace('/city-to-city');
      }
    });
    return () => {
      responseListenerRef.current?.remove();
    };
  }, []);

  return (
    <RootErrorBoundary>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: APP_BG },
        }}
      />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: APP_BG,
    padding: 24,
  },
  errorScroll: { flex: 1 },
  errorScrollContent: { paddingBottom: 40 },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errorMessage: { color: 'rgba(255,255,255,0.95)', fontSize: 14, marginBottom: 12 },
  errorStack: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'monospace', marginBottom: 16 },
  errorHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
});
