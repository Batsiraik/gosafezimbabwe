import * as Location from 'expo-location';
import Constants from 'expo-constants';

export type Coords = { lat: number; lng: number };

export type LocationResult = { coords: Coords; accuracy: number | null };

/** In-memory cache for prefetched/last location so ride page can show in ~1s */
let cachedLocation: LocationResult | null = null;
let cachedAt = 0;
const CACHE_MAX_AGE_MS = 60 * 1000; // 1 min

export function getCachedLocation(): LocationResult | null {
  if (!cachedLocation) return null;
  if (Date.now() - cachedAt > CACHE_MAX_AGE_MS) return null;
  return cachedLocation;
}

export function setCachedLocation(result: LocationResult): void {
  cachedLocation = result;
  cachedAt = Date.now();
}

/**
 * Get current position with accuracy. Returns null if permission denied or error.
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  const result = await getCurrentLocation();
  return result?.coords ?? null;
}

/**
 * Get last known position (fast, from device cache). Returns null if not available.
 */
export async function getLastKnownLocation(): Promise<LocationResult | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000, // accept up to 5 min old
    });
    if (!loc?.coords) return null;
    const accuracy = loc.coords.accuracy ?? null;
    const result: LocationResult = {
      coords: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      accuracy,
    };
    setCachedLocation(result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Get location as fast as possible (1–2 sec): cache → last known → single getCurrentPosition.
 * Use for ride/parcel so UI isn't stuck loading. Then refine with getCurrentLocation({ preferAccurate: true }) in background.
 */
export async function getCurrentLocationFast(): Promise<LocationResult | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  // 1) Fresh cache (e.g. from prefetch)
  const cached = getCachedLocation();
  if (cached) return cached;
  // 2) Last known (instant on Android/iOS when available)
  const last = await getLastKnownLocation();
  if (last) return last;
  // 3) Single request with balanced accuracy (faster than BestForNavigation)
  try {
    const loc = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettings: true,
        maximumAge: 30 * 1000, // accept 30s cached
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ]);
    const accuracy = loc.coords.accuracy ?? null;
    const result: LocationResult = {
      coords: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      accuracy,
    };
    setCachedLocation(result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Call when app or dashboard loads so ride/parcel have location ready in ~1s.
 */
export async function prefetchLocation(): Promise<void> {
  try {
    const result = await getLastKnownLocation();
    if (result) return;
    const fast = await getCurrentLocationFast();
    if (fast) setCachedLocation(fast);
  } catch (_) {}
}

/** Options for getCurrentLocation. */
export type GetCurrentLocationOptions = {
  /** If true, use a short watch (5–8s) and pick the update with best accuracy. More reliable on Android. */
  preferAccurate?: boolean;
};

/**
 * Get current position with accuracy (meters). For ride screen GPS indicator.
 * On Android, the first fix is often a fast network/cell fix (wrong by km). Use preferAccurate: true
 * to watch for a few seconds and use the reading with the best accuracy.
 */
export async function getCurrentLocation(
  options: GetCurrentLocationOptions = {}
): Promise<LocationResult | null> {
  const { preferAccurate = false } = options;
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    if (preferAccurate) {
      return await getCurrentLocationViaWatch();
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
      mayShowUserSettings: true,
      maximumAge: 0,
    });
    const accuracy = loc.coords.accuracy ?? null;
    return {
      coords: { lat: loc.coords.latitude, lng: loc.coords.longitude },
      accuracy: accuracy,
    };
  } catch {
    return null;
  }
}

const WATCH_DURATION_MS = 28000; // Max wait (Capacitor uses 30s)
const WARMUP_MS = 4000;          // Ignore first 4s to avoid bad network fix that reports fake accuracy
const EXCELLENT_ACCURACY_M = 20;
const GOOD_ACCURACY_M = 50;
const MIN_UPDATES_FOR_EXCELLENT = 2;
const MIN_UPDATES_FOR_GOOD = 4;

/**
 * Get location by watching until we get a good fix or timeout.
 * Mirrors Capacitor app: ignore first few seconds (bad first fix), then accept when
 * accuracy is excellent (≤20m) or good (≤50m) after several updates, else best after timeout.
 */
async function getCurrentLocationViaWatch(): Promise<LocationResult | null> {
  const updates: Array<{ coords: Coords; accuracy: number; ts: number }> = [];
  let subscription: { remove: () => void } | null = null;
  const startTime = Date.now();
  let settled = false;

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 5,
    },
    (loc) => {
      const acc = loc.coords.accuracy ?? Infinity;
      updates.push({
        coords: { lat: loc.coords.latitude, lng: loc.coords.longitude },
        accuracy: acc,
        ts: Date.now(),
      });
    }
  );

  const finish = (result: LocationResult | null, clearIntervalId?: () => void): LocationResult | null => {
    if (settled) return result;
    settled = true;
    clearIntervalId?.();
    subscription?.remove();
    return result;
  };

  const result = await new Promise<LocationResult | null>((resolve) => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const clearIntervalId = () => { if (intervalId != null) clearInterval(intervalId); intervalId = null; };

    const checkAndMaybeResolve = () => {
      const afterWarmup = updates.filter((u) => u.ts - startTime > WARMUP_MS);
      if (afterWarmup.length === 0) return false;

      const best = afterWarmup.reduce((a, b) => (a.accuracy <= b.accuracy ? a : b));
      const acc = best.accuracy === Infinity ? null : best.accuracy;

      if (acc != null && acc <= EXCELLENT_ACCURACY_M && afterWarmup.length >= MIN_UPDATES_FOR_EXCELLENT) {
        resolve(finish({ coords: best.coords, accuracy: acc }, clearIntervalId));
        return true;
      }
      if (acc != null && acc <= GOOD_ACCURACY_M && afterWarmup.length >= MIN_UPDATES_FOR_GOOD) {
        resolve(finish({ coords: best.coords, accuracy: acc }, clearIntervalId));
        return true;
      }
      return false;
    };

    intervalId = setInterval(() => {
      if (checkAndMaybeResolve()) return;
      if (Date.now() - startTime >= WATCH_DURATION_MS) {
        clearIntervalId();
        const afterWarmup = updates.filter((u) => u.ts - startTime > WARMUP_MS);
        if (afterWarmup.length > 0) {
          const best = afterWarmup.reduce((a, b) => (a.accuracy <= b.accuracy ? a : b));
          resolve(finish({
            coords: best.coords,
            accuracy: best.accuracy === Infinity ? null : best.accuracy,
          }, clearIntervalId));
        } else {
          resolve(finish(null, clearIntervalId));
        }
      }
    }, 500);
  });

  // Return only what we got from the watch stream. Do NOT fall back to getCurrentPositionAsync —
  // on Android that often returns a cached/network fix (wrong by km). Same method as Capacitor: watch only.
  return result;
}

/** Haversine distance in km */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

const getGoogleApiKey = (): string | null => {
  const key = Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined;
  return key && key.length > 0 ? key : null;
};

/**
 * Reverse geocode: coords -> address. Uses Google Geocoding. Falls back to "Location (lat, lng)" if no key or error.
 */
export async function reverseGeocode(coords: Coords): Promise<string> {
  const key = getGoogleApiKey();
  if (!key) return `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${key}&region=zw`
    );
    const data = await res.json();
    if (data.results?.[0]?.formatted_address) return data.results[0].formatted_address;
  } catch (_) {}
  return `Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
}

/**
 * Geocode: address string -> coords. Uses Google Geocoding. Returns null if no key or not found.
 */
export async function geocodeAddress(address: string): Promise<Coords | null> {
  const key = getGoogleApiKey();
  if (!key || !address.trim()) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.trim())}&key=${key}&region=zw`
    );
    const data = await res.json();
    const loc = data.results?.[0]?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
  } catch (_) {}
  return null;
}
