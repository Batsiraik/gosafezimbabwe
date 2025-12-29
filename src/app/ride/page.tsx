'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Navigation, Plus, Minus, RotateCcw } from 'lucide-react';
import { GoogleMap, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { Geolocation } from '@capacitor/geolocation';
import toast from 'react-hot-toast';
import ActiveRideModal from '@/components/ActiveRideModal';

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places', 'geometry'];

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: -17.8292,
  lng: 31.0522
};

export default function RidePage() {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLocationAddress, setCurrentLocationAddress] = useState<string>('');
  const [currentLocationSuggestions, setCurrentLocationSuggestions] = useState<any[]>([]);
  const [showCurrentLocationSuggestions, setShowCurrentLocationSuggestions] = useState(false);
  const [destination, setDestination] = useState<string>('');
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [distance, setDistance] = useState<number>(0);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);
  const [adjustedPrice, setAdjustedPrice] = useState<number>(0);
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isLoading, setIsLoading] = useState(false); // Don't block on GPS - show map immediately
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [showActiveRideModal, setShowActiveRideModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showGpsTips, setShowGpsTips] = useState(false);
  const [accuracyStatus, setAccuracyStatus] = useState<string>('');
  const [ridePricePerKm, setRidePricePerKm] = useState<number>(0.60); // Default fallback
  const [priceInputValue, setPriceInputValue] = useState<string>(''); // Raw input value for manual price entry
  const [nearbyDrivers, setNearbyDrivers] = useState<Array<{ userId: string; lat: number; lng: number; distance: number; driverName: string }>>([]);
  const activeRidePollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const driverMarkersRef = useRef<google.maps.Marker[]>([]);
  const watchIdRef = useRef<number | string | null>(null);
  const locationLockRef = useRef(false);
  const gpsFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any,
  });

  // Location verification function
  const verifyLocationAccuracy = useCallback(async (coords: { lat: number; lng: number }, accuracy: number) => {
    // If accuracy is good, no need to verify
    if (accuracy <= 50) return true;
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return false;
      
      // Get address from coordinates
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}&region=ZW`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const address = data.results[0].formatted_address;
          
          // Check if address looks reasonable (not in ocean, etc.)
          const isReasonable = !address.includes("Unnamed Road") && 
                              !address.toLowerCase().includes("ocean") &&
                              address.includes(",");
          
          if (!isReasonable) {
            console.warn('Location appears inaccurate:', address);
            return false;
          }
          return true;
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
    }
    
    return false;
  }, []);

  // Reverse geocoding to get human-readable address from coordinates
  const reverseGeocode = useCallback(async (coords: { lat: number; lng: number }) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not found');
        return;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&region=ZW&key=${apiKey}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0]) {
          setCurrentLocationAddress(data.results[0].formatted_address);
        } else {
          console.warn('No address found for this location');
          // Fallback to a readable format if geocoding fails
          setCurrentLocationAddress(`Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        }
      } else {
        console.error('Geocoding API error:', await response.text());
        // Fallback to coordinates in readable format if API fails
        setCurrentLocationAddress(`Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  }, []);

  // Get current location with improved accuracy handling using Capacitor native GPS
  const getCurrentLocation = useCallback(async () => {
    // Check if we're in a native app (Capacitor) or web browser
    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
    
    setIsLoading(true);
    setGpsAccuracy(null);
    locationLockRef.current = false;

    // stop previous watch
    if (watchIdRef.current !== null) {
      if (isNative) {
        Geolocation.clearWatch({ id: watchIdRef.current.toString() });
      } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchIdRef.current === 'number') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }

    // clear previous fallback timer
    if (gpsFallbackTimerRef.current) {
      clearTimeout(gpsFallbackTimerRef.current);
      gpsFallbackTimerRef.current = null;
    }

    // Enhanced accuracy thresholds
    const EXCELLENT_ACCURACY = 20;    // < 20m - Very accurate (outdoors with clear sky)
    const GOOD_ACCURACY = 50;         // < 50m - Good for ride pickup
    const ACCEPTABLE_ACCURACY = 100;  // < 100m - Acceptable
    const MINIMUM_ACCURACY = 150;     // Max we'll accept for ride booking
    const MAX_WAIT_MS = 30000;        // Wait up to 30 seconds for good GPS

    let bestPos: { latitude: number; longitude: number; accuracy?: number } | null = null;
    let accuracyImprovements = 0;
    
    // Update accuracy status in UI
    const updateAccuracyStatus = (status: string, accuracy?: number) => {
      setAccuracyStatus(status);
      if (accuracy !== undefined) {
        console.log(`GPS Status: ${status} (${Math.round(accuracy)}m)`);
      }
    };

    const acceptPosition = (latitude: number, longitude: number, accuracy?: number, final = false) => {
      const loc = { lat: latitude, lng: longitude };
      
      setCurrentLocation(loc);
      setMapCenter(loc);
      setGpsAccuracy(typeof accuracy === 'number' ? accuracy : null);

      // Always fetch address
      reverseGeocode(loc);

      if (final) {
        // Verify location accuracy if accuracy is available (async, don't block)
        if (typeof accuracy === 'number' && accuracy > 50) {
          verifyLocationAccuracy(loc, accuracy).then((isVerified) => {
            if (!isVerified) {
              toast('⚠️ Location may be inaccurate. Please verify on map or type address manually.', {
                icon: '⚠️',
                duration: 5000,
              });
            }
          }).catch(() => {
            // Silently fail verification
          });
        }
        setIsLoading(false);
        if (watchIdRef.current !== null) {
          if (isNative) {
            Geolocation.clearWatch({ id: watchIdRef.current.toString() });
      } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchIdRef.current === 'number') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
          watchIdRef.current = null;
        }
        
        // Show accuracy toast
        if (accuracy && accuracy <= EXCELLENT_ACCURACY) {
          toast.success(`📍 Excellent accuracy: ${Math.round(accuracy)}m`);
        } else if (accuracy && accuracy <= GOOD_ACCURACY) {
          toast.success(`📍 Good accuracy: ${Math.round(accuracy)}m`);
        } else if (accuracy) {
          toast(`📍 Location accuracy: ${Math.round(accuracy)}m. Drag pin if needed.`, { icon: '⚠️' });
        }
      }
    };

    const onUpdate = (latitude: number, longitude: number, accuracy?: number) => {
      const isNewBest = !bestPos || (typeof accuracy === 'number' && bestPos.accuracy && accuracy < bestPos.accuracy);

      // Store best position
      if (isNewBest) {
        bestPos = { latitude, longitude, accuracy };
        accuracyImprovements++;
        
        // Show accuracy improvements
        if (accuracy) {
          if (accuracy <= EXCELLENT_ACCURACY) {
            updateAccuracyStatus('Excellent GPS signal', accuracy);
          } else if (accuracy <= GOOD_ACCURACY) {
            updateAccuracyStatus('Good GPS signal', accuracy);
          } else if (accuracy <= ACCEPTABLE_ACCURACY) {
            updateAccuracyStatus('Moderate accuracy', accuracy);
          } else {
            updateAccuracyStatus('Low accuracy', accuracy);
          }
        }
      }

      // Only accept decent positions for live updates
      if (typeof accuracy === 'number') {
        // Show accuracy in UI
        setGpsAccuracy(accuracy);
        
        // Only update map for positions with good accuracy (60m max for live updates)
        if (accuracy <= GOOD_ACCURACY) {
          acceptPosition(latitude, longitude, accuracy, false);
        }
        
        // Lock if we get excellent or good accuracy
        if (!locationLockRef.current) {
          if (accuracy <= EXCELLENT_ACCURACY) {
            locationLockRef.current = true;
            updateAccuracyStatus('Location locked - Excellent', accuracy);
            acceptPosition(latitude, longitude, accuracy, true);
          } else if (accuracy <= GOOD_ACCURACY && accuracyImprovements >= 3) {
            // Wait for at least 3 improvements before locking with good accuracy
            locationLockRef.current = true;
            updateAccuracyStatus('Location locked - Good', accuracy);
            acceptPosition(latitude, longitude, accuracy, true);
          }
        }
      } else {
        // No accuracy info, but still update position
        acceptPosition(latitude, longitude, undefined, false);
      }
    };

    const handleError = (error: any) => {
      console.error('GPS Error:', error);
      
      let msg = '';
      if (error?.code === 1 || error?.message?.includes('permission')) {
        msg = 'Location access denied. Please enable location services in app settings.';
      } else if (error?.code === 2 || error?.message?.includes('unavailable')) {
        msg = 'Location unavailable. Please check your GPS/WiFi and try again.';
      } else if (error?.code === 3 || error?.message?.includes('timeout')) {
        msg = 'GPS timeout. Taking longer than expected. Try moving to an open area.';
      } else {
        msg = 'GPS error. Please try again.';
      }
      
      toast.error(msg);
      setIsLoading(false);
      
      // Fallback to default location
      const defaultLoc = { lat: -17.8292, lng: 31.0522 };
      setCurrentLocation(defaultLoc);
      setMapCenter(defaultLoc);
      reverseGeocode(defaultLoc);
      
      if (watchIdRef.current !== null) {
        if (isNative) {
          Geolocation.clearWatch({ id: watchIdRef.current.toString() });
        } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchIdRef.current === 'number') {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
      
      // Retry logic
      const MAX_RETRIES = 2;
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        toast(`Retrying GPS (attempt ${retryCountRef.current}/${MAX_RETRIES})...`);
        setTimeout(() => {
          getCurrentLocation();
        }, 2000);
      } else {
        retryCountRef.current = 0; // Reset for next time
      }
    };

    // Show initial status
    updateAccuracyStatus('Starting GPS...');
    retryCountRef.current = 0; // Reset retry counter

    // Use Capacitor Geolocation if in native app, otherwise fallback to browser API
    if (isNative) {
      try {
        // Request permissions first
        const permissionStatus = await Geolocation.checkPermissions();
        if (permissionStatus.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          if (requestResult.location !== 'granted') {
            handleError({ code: 1, message: 'Permission denied' });
            return;
          }
        }

        // 1) Try quick first fix (cached location)
        try {
          const cachedPos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            maximumAge: 60000,
            timeout: 5000,
          });
          const acc = cachedPos.coords.accuracy;
          if (acc && acc <= ACCEPTABLE_ACCURACY) {
            updateAccuracyStatus('Using cached location', acc);
            acceptPosition(cachedPos.coords.latitude, cachedPos.coords.longitude, acc, false);
          }
        } catch (e) {
          // Ignore cached location errors
        }

        // 2) Start high accuracy watch for continuous improvement
        const watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 30000,
          },
          (position, err) => {
            if (err) {
              handleError(err);
            } else if (position) {
              onUpdate(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy
              );
            }
          }
        );
        watchIdRef.current = watchId as any;
      } catch (error) {
        handleError(error);
      }
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // Fallback to browser geolocation for web
      const onUpdateBrowser = (pos: GeolocationPosition) => {
        onUpdate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      };

      const onErrorBrowser = (error: GeolocationPositionError) => {
        handleError(error);
      };

      // 1) Try quick first fix (cached location)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          if (acc && acc <= ACCEPTABLE_ACCURACY) {
            updateAccuracyStatus('Using cached location', acc);
            acceptPosition(pos.coords.latitude, pos.coords.longitude, acc, false);
          }
        },
        null,
        {
          enableHighAccuracy: false,
          maximumAge: 60000,
          timeout: 5000,
        }
      );

      // 2) Start high accuracy watch for continuous improvement
      watchIdRef.current = navigator.geolocation.watchPosition(onUpdateBrowser, onErrorBrowser, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      });
    } else {
      toast.error('Geolocation is not supported. Please enter your location manually.');
      setIsLoading(false);
      const defaultLoc = { lat: -17.8292, lng: 31.0522 };
      setCurrentLocation(defaultLoc);
      setMapCenter(defaultLoc);
      reverseGeocode(defaultLoc);
      return;
    }

    // 3) Fallback timer with improved logic
    gpsFallbackTimerRef.current = setTimeout(() => {
      if (locationLockRef.current) return; // Already got good accuracy

      if (bestPos && typeof bestPos.accuracy === 'number') {
        const acc = bestPos.accuracy;

        if (acc <= MINIMUM_ACCURACY) {
          // Accept the best we got
          locationLockRef.current = true;
          acceptPosition(bestPos.latitude, bestPos.longitude, acc, true);
          
          if (acc > GOOD_ACCURACY) {
            toast(`Using best available location (${Math.round(acc)}m). For better accuracy:`, {
              icon: '📡',
              duration: 5000,
            });
            // Show tips for better accuracy
            setTimeout(() => {
              toast('📍 Tips for better GPS: Move outdoors, enable WiFi, hold phone upright', {
                icon: '💡',
                duration: 5000,
              });
            }, 1000);
          }
        } else {
          // Accuracy too poor
          toast.error(
            `GPS accuracy too low (${Math.round(acc)}m). Please:\n` +
            `1. Move to an open area\n` +
            `2. Enable WiFi/Cellular\n` +
            `3. Type location manually\n` +
            `4. Drag the pin on map`,
            { duration: 8000 }
          );
          setIsLoading(false);
          
          // Still set location so user can see and adjust
          if (bestPos) {
            const loc = { lat: bestPos.latitude, lng: bestPos.longitude };
            setCurrentLocation(loc);
            setMapCenter(loc);
            reverseGeocode(loc);
          }
        }
      } else if (bestPos) {
        // Position without accuracy info - still use it
        locationLockRef.current = true;
        acceptPosition(bestPos.latitude, bestPos.longitude, undefined, true);
      } else {
        // No position at all
        toast.error('No GPS signal detected. Please check permissions and try again.');
        setIsLoading(false);
        const defaultLoc = { lat: -17.8292, lng: 31.0522 };
        setCurrentLocation(defaultLoc);
        setMapCenter(defaultLoc);
        reverseGeocode(defaultLoc);
      }
    }, MAX_WAIT_MS);
  }, [reverseGeocode, verifyLocationAccuracy]);

  // Stop polling helper
  const stopPollingActiveRide = useCallback(() => {
    if (activeRidePollIntervalRef.current) {
      clearInterval(activeRidePollIntervalRef.current);
      activeRidePollIntervalRef.current = null;
    }
  }, []);

  // Poll for active ride status updates
  const startPollingActiveRide = useCallback(() => {
    // Clear any existing interval
    stopPollingActiveRide();

    // Poll every 5 seconds
    activeRidePollIntervalRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem('nexryde_token');
        if (!token) {
          stopPollingActiveRide();
          return;
        }

        const response = await fetch('/api/rides/active', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.activeRide) {
            setActiveRide(data.activeRide);
            setShowActiveRideModal(true);
          } else {
            setActiveRide(null);
            setShowActiveRideModal(false);
            stopPollingActiveRide();
          }
        }
      } catch (error) {
        console.error('Error polling active ride:', error);
      }
    }, 10000);
  }, [stopPollingActiveRide]);

  // Check for active ride
  const checkActiveRide = useCallback(async () => {
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        setActiveRide(null);
        setShowActiveRideModal(false);
        return;
      }

      const response = await fetch('/api/rides/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.activeRide) {
          setActiveRide(data.activeRide);
          setShowActiveRideModal(true);
          // Polling is handled by the useEffect interval, no need to start separate polling
        } else {
          setActiveRide(null);
          setShowActiveRideModal(false);
        }
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  }, []);

  // Handle booking submission
  const handleBookRide = useCallback(async () => {
    if (!currentLocation || !destinationCoords) {
      toast.error('Please select pickup and destination locations');
      return;
    }

    if (!currentLocationAddress || !destination) {
      toast.error('Please ensure both locations have addresses');
      return;
    }

    if (distance === 0) {
      toast.error('Please wait for route calculation');
      return;
    }

    setIsBooking(true);
    try {
      const token = localStorage.getItem('nexryde_token');
      if (!token) {
        toast.error('Please log in to book a ride');
        router.push('/auth/login');
        return;
      }

      const response = await fetch('/api/rides/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickupLat: currentLocation.lat,
          pickupLng: currentLocation.lng,
          pickupAddress: currentLocationAddress,
          destinationLat: destinationCoords.lat,
          destinationLng: destinationCoords.lng,
          destinationAddress: destination,
          distance,
          price: adjustedPrice,
          isRoundTrip,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to book ride');
        return;
      }

      toast.success('Ride request created! Searching for drivers...');
      // Refresh active ride
      await checkActiveRide();
    } catch (error) {
      console.error('Booking error:', error);
      toast.error('Failed to book ride. Please try again.');
    } finally {
      setIsBooking(false);
    }
  }, [currentLocation, destinationCoords, currentLocationAddress, destination, distance, adjustedPrice, isRoundTrip, router, checkActiveRide]);

  // Check for active ride on mount and set up continuous polling
  useEffect(() => {
    // Check immediately on mount (no delay)
    checkActiveRide();
    
    // Set up continuous polling every 10 seconds to ensure modal stays visible
    const pollInterval = setInterval(() => {
      checkActiveRide();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      stopPollingActiveRide();
    };
  }, [checkActiveRide, stopPollingActiveRide]);

  // Fetch pricing settings
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/pricing');
        if (response.ok) {
          const data = await response.json();
          setRidePricePerKm(data.ridePricePerKm || 0.60);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      }
    };
    fetchPricing();
  }, []);

  // Initialize default location when map loads (so map shows immediately)
  useEffect(() => {
    if (isLoaded && !currentLocation) {
      const defaultLoc = { lat: -17.8292, lng: 31.0522 };
      setCurrentLocation(defaultLoc);
      setMapCenter(defaultLoc);
      // Get address for default location
      reverseGeocode(defaultLoc);
      // Try to get GPS location in background
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
      if (isNative || (typeof navigator !== 'undefined' && navigator.geolocation)) {
        getCurrentLocation();
      }
    }
  }, [isLoaded, currentLocation, getCurrentLocation, reverseGeocode]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPollingActiveRide();
    };
  }, [stopPollingActiveRide]);

  // Cleanup timeout and geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
      if (watchIdRef.current !== null) {
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
        if (isNative) {
          Geolocation.clearWatch({ id: watchIdRef.current.toString() });
        } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchIdRef.current === 'number') {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
      if (gpsFallbackTimerRef.current) {
        clearTimeout(gpsFallbackTimerRef.current);
        gpsFallbackTimerRef.current = null;
      }
      // Clear driver markers
      driverMarkersRef.current.forEach((marker) => {
        if (marker instanceof google.maps.Marker) {
          google.maps.event.clearInstanceListeners(marker);
          marker.setMap(null);
        }
      });
      driverMarkersRef.current = [];
    };
  }, []);

  // Clear driver markers when there's an active ride
  useEffect(() => {
    if (activeRide) {
      driverMarkersRef.current.forEach((marker) => {
        if (marker instanceof google.maps.Marker) {
          marker.setMap(null);
        }
      });
      driverMarkersRef.current = [];
      setNearbyDrivers([]);
    }
  }, [activeRide]);

  // Handle current location input with autocomplete
  const handleCurrentLocationInput = async (value: string) => {
    // If user is typing manually, stop GPS updates
    if (watchIdRef.current !== null) {
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
      if (isNative) {
        Geolocation.clearWatch({ id: watchIdRef.current.toString() });
      } else if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchIdRef.current === 'number') {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    if (gpsFallbackTimerRef.current) {
      clearTimeout(gpsFallbackTimerRef.current);
      gpsFallbackTimerRef.current = null;
    }
    locationLockRef.current = true; // treat as "locked" now

    setCurrentLocationAddress(value);
    setShowCurrentLocationSuggestions(value.length > 0);
    
    if (value.length < 2) {
      setCurrentLocationSuggestions([]);
      return;
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
          },
          body: JSON.stringify({
            input: value,
            includedRegionCodes: ['ZW'],
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) {
          setCurrentLocationSuggestions(data.suggestions);
        }
      }
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    }
  };

  // Select current location from autocomplete
  const selectCurrentLocation = async (placeId: string, text: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
          }
        }
      );

      if (response.ok) {
        const place = await response.json();
        if (place.location) {
          const coords = {
            lat: place.location.latitude,
            lng: place.location.longitude
          };
          setCurrentLocation(coords);
          setCurrentLocationAddress(place.formattedAddress || place.displayName?.text || text);
          setMapCenter(coords);
          setShowCurrentLocationSuggestions(false);
          setCurrentLocationSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
      toast.error('Could not get location details');
    }
  };

  // Handle destination input changes with new Places API (New)
  const handleDestinationInput = async (value: string) => {
    setDestination(value);
    
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (value.length < 3) {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce API calls
    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key not found');
          return;
        }

        // Use new Places API (New) REST endpoint
        const response = await fetch(
          `https://places.googleapis.com/v1/places:autocomplete`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
            },
            body: JSON.stringify({
              input: value,
              includedRegionCodes: ['ZW'],
              locationBias: currentLocation ? {
                circle: {
                  center: {
                    latitude: currentLocation.lat,
                    longitude: currentLocation.lng
                  },
                  radius: 50000 // 50km radius
                }
              } : undefined
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAutocompleteSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        } else {
          console.error('Autocomplete API error:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching autocomplete suggestions:', error);
      }
    }, 300);
  };

  // Get place details when user selects a suggestion
  const selectPlace = async (placeId: string, text: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      // Get place details using new Places API (New)
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location'
          }
        }
      );

      if (response.ok) {
        const place = await response.json();
        if (place.location) {
          const coords = {
            lat: place.location.latitude,
            lng: place.location.longitude
          };
          setDestinationCoords(coords);
          setDestination(place.formattedAddress || place.displayName?.text || text);
          setMapCenter(coords);
          setShowSuggestions(false);
          setAutocompleteSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      toast.error('Could not get place details');
    }
  };

  // Calculate route and distance using new Routes API
  const calculateRoute = useCallback(async () => {
    if (!currentLocation || !destinationCoords || !isLoaded) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      toast.error('Google Maps API key not configured');
      return;
    }

    try {
      // Use new Routes API (REST endpoint)
      const response = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: destinationCoords.lat,
                  longitude: destinationCoords.lng
                }
              }
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            computeAlternativeRoutes: false,
            units: 'METRIC'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distanceInMeters = route.distanceMeters || 0;
          const distanceInKm = distanceInMeters / 1000;
          
          setDistance(distanceInKm);
          
          // Calculate price: $0.60 per km
          const basePrice = distanceInKm * 0.60;
          const finalPrice = isRoundTrip ? basePrice * 2 : basePrice;
          setSuggestedPrice(finalPrice);
          setAdjustedPrice(finalPrice);

          // Decode polyline for map display
          if (route.polyline?.encodedPolyline && window.google?.maps?.geometry) {
            const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline);
            // Convert to LatLngLiteral array
            const pathArray = decodedPath.map((point: google.maps.LatLng) => ({
              lat: point.lat(),
              lng: point.lng()
            }));
            setRoutePath(pathArray);
            
            // Fit bounds to show entire route
            if (mapRef.current && pathArray.length > 0) {
              const bounds = new google.maps.LatLngBounds();
              pathArray.forEach((point) => bounds.extend(point));
              mapRef.current.fitBounds(bounds);
            }
          }
          
          // Route calculated silently (no toast)
        } else {
          toast('No route found', { icon: '⚠️' });
        }
      } else {
        const errorData = await response.json();
        console.error('Routes API error:', errorData);
        
        // Fallback: Try to calculate straight-line distance if API fails
        const distanceInKm = calculateStraightLineDistance(currentLocation, destinationCoords);
        setDistance(distanceInKm);
        const basePrice = distanceInKm * 0.60;
        const finalPrice = isRoundTrip ? basePrice * 2 : basePrice;
        setSuggestedPrice(finalPrice);
        setAdjustedPrice(finalPrice);
        
        toast('Using estimated distance. Enable Routes API for accurate routing.', { icon: '⚠️' });
        
        // Draw straight line as fallback
        setRoutePath([currentLocation, destinationCoords]);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      
      // Fallback: Calculate straight-line distance
      const distanceInKm = calculateStraightLineDistance(currentLocation, destinationCoords);
      setDistance(distanceInKm);
      const basePrice = distanceInKm * 0.60;
      const finalPrice = isRoundTrip ? basePrice * 2 : basePrice;
      setSuggestedPrice(finalPrice);
      setAdjustedPrice(finalPrice);
      
      toast.error('Could not calculate route. Using estimated distance.');
      
      // Draw straight line as fallback
      setRoutePath([currentLocation, destinationCoords]);
    }
  }, [currentLocation, destinationCoords, isRoundTrip, isLoaded]);

  // Helper function to calculate straight-line distance (Haversine formula)
  const calculateStraightLineDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Recalculate when round trip changes
  useEffect(() => {
    if (distance > 0) {
      const basePrice = distance * ridePricePerKm;
      const finalPrice = isRoundTrip ? basePrice * 2 : basePrice;
      setSuggestedPrice(finalPrice);
      setAdjustedPrice(finalPrice);
      // Update input value to match
      setPriceInputValue(finalPrice.toFixed(2));
    }
  }, [isRoundTrip, distance, ridePricePerKm]);

  // Recalculate route when current location becomes available and destination is set
  useEffect(() => {
    if (currentLocation && destinationCoords && isLoaded) {
      console.log('Recalculating route with current location:', currentLocation, 'and destination:', destinationCoords);
      calculateRoute();
    }
  }, [currentLocation, destinationCoords, isLoaded, calculateRoute]);

  const handleIncreasePrice = () => {
    setAdjustedPrice(prev => prev + 0.50);
    // Update input value to match
    setPriceInputValue((adjustedPrice + 0.50).toFixed(2));
  };

  const handleDecreasePrice = () => {
    const newPrice = Math.max(0, adjustedPrice - 0.50);
    setAdjustedPrice(newPrice);
    // Update input value to match
    if (newPrice === 0) {
      setPriceInputValue('');
    } else {
      setPriceInputValue(newPrice.toFixed(2));
    }
  };

  const handleManualPriceChange = (value: string) => {
    // Store raw input value - allow user to type freely
    setPriceInputValue(value);
    
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // If empty, set price to 0 but keep input empty
    if (cleaned === '' || cleaned === '.') {
      setAdjustedPrice(0);
      return;
    }
    
    // Only allow one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return; // Invalid format, don't update
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return; // Too many decimal places, don't update
    }
    
    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue) && numValue >= 0) {
      setAdjustedPrice(numValue);
    }
  };

  const handlePriceInputBlur = () => {
    // Format the value on blur - show formatted version
    if (adjustedPrice === 0) {
      setPriceInputValue('');
    } else {
      setPriceInputValue(adjustedPrice.toFixed(2));
    }
  };

  const handlePriceInputFocus = () => {
    // When focused, show raw value or empty if 0
    if (adjustedPrice === 0) {
      setPriceInputValue('');
    } else {
      // Remove trailing zeros for easier editing
      setPriceInputValue(adjustedPrice.toString());
    }
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    console.log('Map loaded, updating markers...');
    // Update markers immediately - traditional Marker API is always available
    updateMarkers();
  };

  // Helper function to create custom marker icon (person icon for current location)
  const createPersonIcon = (color: string): google.maps.Icon => {
    const svg = `
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <!-- Shadow -->
        <ellipse cx="20" cy="48" rx="12" ry="4" fill="rgba(0,0,0,0.2)"/>
        <!-- Pin body -->
        <path d="M20 0 C12 0 6 6 6 14 C6 20 12 26 20 32 C28 26 34 20 34 14 C34 6 28 0 20 0 Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <!-- Person icon -->
        <circle cx="20" cy="16" r="6" fill="${color}"/>
        <path d="M20 24 C14 24 10 28 10 34 L10 40 L30 40 L30 34 C30 28 26 24 20 24 Z" fill="${color}"/>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(40, 50),
      anchor: new google.maps.Point(20, 50),
    };
  };

  // Helper function to create custom destination pin icon
  const createDestinationPinIcon = (color: string): google.maps.Icon => {
    const svg = `
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <!-- Shadow -->
        <ellipse cx="20" cy="48" rx="12" ry="4" fill="rgba(0,0,0,0.2)"/>
        <!-- Pin body -->
        <path d="M20 0 C12 0 6 6 6 14 C6 20 12 26 20 32 C28 26 34 20 34 14 C34 6 28 0 20 0 Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <!-- Destination icon (flag) -->
        <rect x="14" y="8" width="12" height="10" fill="${color}" rx="1"/>
        <path d="M26 8 L26 18 L30 15 Z" fill="${color}"/>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(40, 50),
      anchor: new google.maps.Point(20, 50),
    };
  };

  // Helper function to create car icon for drivers
  const createCarIcon = (): google.maps.Icon => {
    const svg = `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <!-- Car body -->
        <rect x="4" y="12" width="24" height="12" rx="2" fill="#F5BF19" stroke="#FFFFFF" stroke-width="1.5"/>
        <!-- Windshield -->
        <rect x="6" y="14" width="8" height="6" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <!-- Rear window -->
        <rect x="18" y="14" width="8" height="6" rx="1" fill="#FFFFFF" opacity="0.3"/>
        <!-- Wheels -->
        <circle cx="10" cy="26" r="3" fill="#333333"/>
        <circle cx="22" cy="26" r="3" fill="#333333"/>
        <!-- Wheel highlights -->
        <circle cx="10" cy="26" r="1.5" fill="#666666"/>
        <circle cx="22" cy="26" r="1.5" fill="#666666"/>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16),
    };
  };

  // Fetch nearby drivers
  const fetchNearbyDrivers = useCallback(async () => {
    if (!currentLocation || !isLoaded) return;

    try {
      const response = await fetch(
        `/api/drivers/nearby?lat=${currentLocation.lat}&lng=${currentLocation.lng}&radius=10&serviceType=taxi`
      );

      if (response.ok) {
        const data = await response.json();
        setNearbyDrivers(data.drivers || []);
      }
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
    }
  }, [currentLocation, isLoaded]);

  // Update driver markers on map
  const updateDriverMarkers = useCallback(() => {
    if (!mapRef.current || !isLoaded) return;

    // Clear existing driver markers
    driverMarkersRef.current.forEach((marker) => {
      if (marker instanceof google.maps.Marker) {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      }
    });
    driverMarkersRef.current = [];

    // Create markers for each nearby driver
    nearbyDrivers.forEach((driver) => {
      try {
        const marker = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: driver.lat, lng: driver.lng },
          title: `${driver.driverName} - ${driver.distance.toFixed(1)}km away`,
          icon: createCarIcon(),
          zIndex: 500, // Below pickup/destination markers
        });
        driverMarkersRef.current.push(marker);
      } catch (error) {
        console.error('Error creating driver marker:', error);
      }
    });
  }, [nearbyDrivers, isLoaded]);

  // Update markers using traditional Marker API with custom icons
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !isLoaded) {
      console.log('Map not ready for markers:', { mapReady: !!mapRef.current, isLoaded });
      return;
    }

    // Clear existing markers and event listeners
    if (currentMarkerRef.current) {
      if (currentMarkerRef.current instanceof google.maps.Marker) {
        google.maps.event.clearInstanceListeners(currentMarkerRef.current);
        currentMarkerRef.current.setMap(null);
      }
      currentMarkerRef.current = null;
    }
    if (destinationMarkerRef.current) {
      if (destinationMarkerRef.current instanceof google.maps.Marker) {
        google.maps.event.clearInstanceListeners(destinationMarkerRef.current);
        destinationMarkerRef.current.setMap(null);
      }
      destinationMarkerRef.current = null;
    }
    
    // Clear previous accuracy circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
      accuracyCircleRef.current = null;
    }

    // Create current location marker with person icon - now draggable
    if (currentLocation) {
      try {
        currentMarkerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: currentLocation,
          title: 'You are here - Drag to adjust',
          icon: createPersonIcon('#F5BF19'), // Yellow color
          animation: google.maps.Animation.DROP,
          zIndex: 1000,
          draggable: true, // Make it draggable
        });

        // Add dragend listener to update position
        currentMarkerRef.current.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newPos = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            setCurrentLocation(newPos);
            setMapCenter(newPos);
            setGpsAccuracy(null); // Clear GPS accuracy when manually adjusted
            reverseGeocode(newPos); // Update address via reverse geocoding
            toast.success('Location adjusted');
            // Route will recalculate automatically via useEffect
          }
        });
        
        // Add accuracy circle around current location if GPS accuracy is available
        if (gpsAccuracy && gpsAccuracy > 0 && gpsAccuracy <= 200) {
          accuracyCircleRef.current = new google.maps.Circle({
            map: mapRef.current,
            center: currentLocation,
            radius: gpsAccuracy, // Accuracy in meters
            fillColor: '#F5BF19',
            fillOpacity: 0.1,
            strokeColor: '#F5BF19',
            strokeOpacity: 0.3,
            strokeWeight: 1,
            zIndex: 1,
          });
        }

        console.log('Current location marker created at:', currentLocation);
      } catch (error) {
        console.error('Error creating current location marker:', error);
      }
    }

    // Create destination marker with pin icon
    if (destinationCoords) {
      try {
        destinationMarkerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: destinationCoords,
          title: 'Destination',
          icon: createDestinationPinIcon('#F5BF19'), // Yellow color
          animation: google.maps.Animation.DROP,
          zIndex: 999,
        });
        console.log('Destination marker created at:', destinationCoords);
      } catch (error) {
        console.error('Error creating destination marker:', error);
      }
    }
  }, [currentLocation, destinationCoords, isLoaded, reverseGeocode]);

  // Update markers when locations change
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      updateMarkers();
    }
  }, [currentLocation, destinationCoords, isLoaded, reverseGeocode, gpsAccuracy]);

  // Fetch nearby drivers when location is available
  useEffect(() => {
    if (currentLocation && isLoaded && !activeRide) {
      fetchNearbyDrivers();
      // Refresh nearby drivers every 30 seconds
      const interval = setInterval(() => {
        fetchNearbyDrivers();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentLocation, isLoaded, activeRide, fetchNearbyDrivers]);

  // Update driver markers when nearby drivers change
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      updateDriverMarkers();
    }
  }, [nearbyDrivers, isLoaded, updateDriverMarkers]);

  // GPS Accuracy Indicator Component
  const GpsAccuracyIndicator = ({ accuracy }: { accuracy: number }) => {
    if (accuracy === null) return null;
    
    let status = '';
    let color = '';
    
    if (accuracy <= 20) {
      status = 'Excellent';
      color = 'bg-green-500';
    } else if (accuracy <= 50) {
      status = 'Good';
      color = 'bg-green-400';
    } else if (accuracy <= 100) {
      status = 'Fair';
      color = 'bg-yellow-500';
    } else if (accuracy <= 150) {
      status = 'Low';
      color = 'bg-orange-500';
    } else {
      status = 'Poor';
      color = 'bg-red-500';
    }
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
          <span className="text-xs text-gray-600">
            GPS: {status} (~{Math.round(accuracy)}m)
          </span>
        </div>
        {accuracy > 100 && (
          <span className="text-xs text-yellow-600">
            • Move outdoors for better accuracy
          </span>
        )}
      </div>
    );
  };


  // Center map on current location when it's obtained
  useEffect(() => {
    if (mapRef.current && currentLocation && isLoaded) {
      mapRef.current.setCenter(currentLocation);
      mapRef.current.setZoom(15); // Zoom in closer to show location clearly
      console.log('Map centered on current location:', currentLocation);
    }
  }, [currentLocation, isLoaded]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center p-4">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Error loading Google Maps</p>
          <p className="text-white/70 mb-2">Please check your API key in .env.local</p>
          {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <p className="text-yellow-400 text-sm">
              Missing: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show map even if GPS is still loading - don't block on GPS
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-2">Loading map...</div>
          {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <div className="text-yellow-400 text-sm mt-2">
              Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local and restart the server.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
      <div className={`min-h-screen bg-nexryde-yellow-darker relative ${showActiveRideModal && activeRide ? 'pointer-events-none overflow-hidden' : ''}`}>
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Book a Ride</h1>
          </div>
        </div>
      </div>

      {/* Full Screen Map */}
      <div className="fixed inset-0 top-[73px] bottom-0 z-0">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={currentLocation ? 13 : 10}
          onLoad={handleMapLoad}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {/* Route line */}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#F5BF19',
                strokeOpacity: 1,
                strokeWeight: 4,
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Floating Location Inputs Overlay - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-20 pb-4 px-2 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Location Inputs - Hide when route is calculated */}
          {!(distance > 0 || destinationCoords) && (
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/20 space-y-4">
              {/* Current Location */}
              <div className="relative">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  From (Current Location)
                </label>
                <div className="relative flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type="text"
                      value={currentLocationAddress || 'Getting location...'}
                      onChange={(e) => handleCurrentLocationInput(e.target.value)}
                      onFocus={() => {
                        if (currentLocationSuggestions.length > 0) {
                          setShowCurrentLocationSuggestions(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowCurrentLocationSuggestions(false), 200);
                      }}
                      placeholder="Enter your location or use GPS"
                      disabled={!!activeRide}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {/* Current Location Suggestions */}
                    {showCurrentLocationSuggestions && currentLocationSuggestions.length > 0 && (
                      <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto">
                        {currentLocationSuggestions.map((suggestion, index) => {
                          const placeId = suggestion.placePrediction?.placeId;
                          const text = suggestion.placePrediction?.text?.text || '';
                          if (!placeId) return null;
                          return (
                            <button
                              key={index}
                              onClick={() => selectCurrentLocation(placeId, text)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <p className="text-gray-900 font-medium">{text}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={getCurrentLocation}
                      disabled={!!activeRide}
                      className="px-4 py-3 bg-nexryde-yellow text-white rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed relative group flex items-center gap-2"
                      title="Use GPS location"
                    >
                      <div className={`w-2 h-2 rounded-full ${isLoading ? 'animate-ping bg-white' : 'bg-white'}`} />
                      <span>{isLoading ? 'Getting GPS...' : '📍 GPS'}</span>
                    </button>
                    
                    {/* GPS Tips Button */}
                    <button
                      onClick={() => setShowGpsTips(true)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-blue-600 transition-colors"
                      title="GPS Tips"
                    >
                      ?
                    </button>
                  </div>
                </div>
                
                {/* GPS Accuracy Indicator */}
                {gpsAccuracy !== null && (
                  <div className="mt-2">
                    <GpsAccuracyIndicator accuracy={gpsAccuracy} />
                  </div>
                )}
                
                {/* Accuracy Status */}
                {accuracyStatus && (
                  <p className="mt-1 text-xs text-gray-500 italic">
                    {accuracyStatus}
                  </p>
                )}
              </div>

              {/* Destination */}
              <div className="relative">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  To (Destination)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                  <input
                    ref={destinationInputRef}
                    type="text"
                    value={destination}
                    onChange={(e) => handleDestinationInput(e.target.value)}
                    onFocus={() => {
                      if (autocompleteSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow click
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    placeholder="Enter destination"
                    disabled={!!activeRide}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {showSuggestions && autocompleteSuggestions.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto">
                      {autocompleteSuggestions.map((suggestion, index) => {
                        const placeId = suggestion.placePrediction?.placeId;
                        const text = suggestion.placePrediction?.text?.text || '';
                        if (!placeId) return null;
                        
                        return (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent onBlur from firing
                              selectPlace(placeId, text);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-gray-900 font-medium">{text}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Round Trip Option */}
              <div className="flex items-center space-x-3 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRoundTrip}
                    onChange={(e) => setIsRoundTrip(e.target.checked)}
                    disabled={!!activeRide}
                    className="w-5 h-5 rounded border-gray-300 bg-white text-nexryde-yellow focus:ring-2 focus:ring-nexryde-yellow focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="w-4 h-4 text-gray-700" />
                    <span className="text-sm font-medium text-gray-700">Round Trip</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Distance and Price - Show when route is calculated, hide location inputs */}
          {(distance > 0 || destinationCoords) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/20"
            >
              <div className="space-y-4">
                {/* Edit button to show location inputs again */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setDestination('');
                      setDestinationCoords(null);
                      setDistance(0);
                      setRoutePath([]);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Edit locations
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Distance:</span>
                  <span className="text-gray-900 font-semibold">{distance.toFixed(2)} km</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Suggested Price:</span>
                  <span className="text-gray-900 font-semibold">${suggestedPrice.toFixed(2)}</span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="mb-4">
                    <label className="block text-gray-900 font-medium mb-2">Your Price:</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleDecreasePrice}
                        disabled={!!activeRide || adjustedPrice <= 0}
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-5 h-5 text-gray-700" />
                      </button>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input
                          type="text"
                          value={priceInputValue}
                          onChange={(e) => handleManualPriceChange(e.target.value)}
                          onFocus={handlePriceInputFocus}
                          onBlur={handlePriceInputBlur}
                          disabled={!!activeRide}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 text-center font-bold text-xl focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <button
                        onClick={handleIncreasePrice}
                        disabled={!!activeRide}
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Enter any price you want - drivers may accept lower offers
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleBookRide}
                  disabled={isBooking || !currentLocation || !destinationCoords || distance === 0 || !!activeRide}
                  className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activeRide ? 'You have an active ride' : isBooking ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Active Ride Modal - Always show when there's an active ride, non-closable */}
      {showActiveRideModal && activeRide && (
        <ActiveRideModal
          activeRide={activeRide}
          onClose={() => {}} // Disable close - modal should not be closable
          onCancel={() => {
            setActiveRide(null);
            setShowActiveRideModal(false);
            stopPollingActiveRide();
          }}
        />
      )}
      
      {/* GPS Tips Modal */}
      {showGpsTips && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowGpsTips(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">📡 Improve GPS Accuracy</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Move to an open area away from buildings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Enable WiFi (even if not connected)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Hold phone upright, not flat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Wait 10-15 seconds for GPS to settle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Disable battery saver mode</span>
              </li>
            </ul>
            <button
              onClick={() => setShowGpsTips(false)}
              className="mt-6 w-full bg-nexryde-yellow text-white py-3 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

