/**
 * Improved geolocation utility for better accuracy
 * Uses watchPosition to continuously refine location until good accuracy is achieved
 */

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onSuccess: (position: GeolocationPosition) => void;
  onError?: (error: GeolocationPositionError) => void;
  minAccuracy?: number; // Minimum accuracy in meters to accept
  maxWaitTime?: number; // Maximum time to wait for good accuracy (ms)
}

/**
 * Get current location with improved accuracy
 * Uses watchPosition to continuously refine until good accuracy is achieved
 */
export function getAccurateLocation(options: GeolocationOptions): () => void {
  const {
    enableHighAccuracy = true,
    timeout = 30000,
    maximumAge = 0,
    onSuccess,
    onError,
    minAccuracy = 50, // Accept location if accuracy is within 50 meters
    maxWaitTime = 20000, // Wait up to 20 seconds for good accuracy
  } = options;

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (onError) {
      const error = {
        code: 0,
        message: 'Geolocation is not supported',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;
      onError(error);
    }
    return () => {}; // Return no-op cleanup function
  }

  let watchId: number | null = null;
  let timeoutId: NodeJS.Timeout | null = null;
  let bestPosition: GeolocationPosition | null = null;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const handlePosition = (position: GeolocationPosition) => {
    if (isCleanedUp) return;

    const accuracy = position.coords.accuracy;
    
    // Track best position
    if (!bestPosition || (typeof accuracy === 'number' && accuracy < bestPosition.coords.accuracy)) {
      bestPosition = position;
    }

    // If accuracy is good enough, accept it immediately
    if (typeof accuracy === 'number' && accuracy <= minAccuracy) {
      cleanup();
      onSuccess(position);
      return;
    }

    // For mobile devices, also accept if accuracy is reasonable (within 200m)
    // This helps when GPS is still refining
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    
    if (isMobile && typeof accuracy === 'number' && accuracy <= 200) {
      // Accept but continue watching for better accuracy
      onSuccess(position);
    }
  };

  const handleError = (error: GeolocationPositionError) => {
    if (isCleanedUp) return;

    cleanup();

    // If we have a best position, use it even if not perfect
    if (bestPosition) {
      onSuccess(bestPosition);
      return;
    }

    if (onError) {
      onError(error);
    }
  };

  // Set timeout to stop watching after maxWaitTime
  timeoutId = setTimeout(() => {
    if (isCleanedUp) return;
    
    cleanup();
    
    // Use best position we got, even if not perfect
    if (bestPosition) {
      onSuccess(bestPosition);
    } else if (onError) {
      const error = {
        code: 3, // TIMEOUT
        message: 'Location request timed out',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError;
      onError(error);
    }
  }, maxWaitTime);

  // Start watching position
  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleError,
    {
      enableHighAccuracy,
      timeout,
      maximumAge,
    }
  );

  // Also try getCurrentPosition for immediate result (may be less accurate)
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (!isCleanedUp) {
        handlePosition(position);
      }
    },
    (error) => {
      // Ignore errors from getCurrentPosition, watchPosition will handle it
    },
    {
      enableHighAccuracy,
      timeout: Math.min(timeout, 10000), // Shorter timeout for initial attempt
      maximumAge,
    }
  );

  return cleanup;
}

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Check if device is mobile (better GPS accuracy)
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get location with fallback to manual input
 * Returns null if geolocation fails or is not supported
 */
export async function getLocationWithFallback(): Promise<{
  lat: number;
  lng: number;
  accuracy?: number;
} | null> {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve(null);
      return;
    }

    const cleanup = getAccurateLocation({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
      minAccuracy: isMobileDevice() ? 50 : 200, // Stricter on mobile
      maxWaitTime: 15000,
      onSuccess: (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      onError: () => {
        resolve(null);
      },
    });

    // Auto-cleanup after 20 seconds if not resolved
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 20000);
  });
}
