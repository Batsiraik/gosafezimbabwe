import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface LocationUpdateCallback {
  (lat: number, lng: number, accuracy?: number): void | Promise<void>;
}

let watchId: string | number | null = null;
let isTracking = false;
let currentCallback: LocationUpdateCallback | null = null;

/**
 * Start background location tracking for drivers
 * This will continue tracking even when app is in background
 */
export async function startBackgroundLocationTracking(
  onLocationUpdate: LocationUpdateCallback,
  updateInterval: number = 30000 // Update every 30 seconds
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[BG LOCATION] Background tracking only works in native app');
    return false;
  }

  if (isTracking) {
    console.log('[BG LOCATION] Already tracking, stopping previous session...');
    await stopBackgroundLocationTracking();
  }

  try {
    // Request permissions
    const permissionStatus = await Geolocation.checkPermissions();
    if (permissionStatus.location !== 'granted') {
      const requestResult = await Geolocation.requestPermissions();
      if (requestResult.location !== 'granted') {
        console.error('[BG LOCATION] Location permission denied');
        return false;
      }
    }

    // Request background location permission (Android)
    if (Capacitor.getPlatform() === 'android') {
      try {
        // Android 10+ requires background location permission
        const backgroundPerm = await Geolocation.checkPermissions();
        // Note: Background location permission request might need to be done manually
        // or through Android settings. For now, we'll use foreground service.
      } catch (e) {
        console.warn('[BG LOCATION] Background permission check failed:', e);
      }
    }

    currentCallback = onLocationUpdate;
    isTracking = true;

    console.log('[BG LOCATION] Starting background location tracking...');

    // Use watchPosition for continuous tracking
    const watchIdResult = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      },
      async (position, err) => {
        if (err) {
          console.error('[BG LOCATION] Location error:', err);
          return;
        }

        if (position && currentCallback) {
          const { latitude, longitude, accuracy } = position.coords;
          console.log(`[BG LOCATION] Location update: (${latitude}, ${longitude}), accuracy: ${accuracy}m`);
          
          try {
            await currentCallback(latitude, longitude, accuracy);
          } catch (error) {
            console.error('[BG LOCATION] Error in location callback:', error);
          }
        }
      }
    );

    watchId = watchIdResult as any;
    console.log('[BG LOCATION] ✅ Background tracking started. Watch ID:', watchId);

    // Handle app state changes
    App.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        console.log('[BG LOCATION] App is now active');
      } else {
        console.log('[BG LOCATION] App is now in background - location tracking continues');
      }
    });

    return true;
  } catch (error) {
    console.error('[BG LOCATION] Error starting background tracking:', error);
    isTracking = false;
    currentCallback = null;
    return false;
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  if (!isTracking || !watchId) {
    return;
  }

  try {
    console.log('[BG LOCATION] Stopping background location tracking...');
    
    if (typeof watchId === 'string') {
      await Geolocation.clearWatch({ id: watchId });
    } else if (typeof watchId === 'number') {
      // Fallback for browser geolocation
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    }

    watchId = null;
    isTracking = false;
    currentCallback = null;

    console.log('[BG LOCATION] ✅ Background tracking stopped');
  } catch (error) {
    console.error('[BG LOCATION] Error stopping background tracking:', error);
  }
}

/**
 * Check if background tracking is active
 */
export function isBackgroundTrackingActive(): boolean {
  return isTracking;
}
