'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Navigation, Plus, Minus, RotateCcw } from 'lucide-react';
import { GoogleMap, Polyline, useJsApiLoader } from '@react-google-maps/api';
import toast from 'react-hot-toast';

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ['places', 'geometry'];

const containerStyle = {
  width: '100%',
  height: '400px'
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
  const [isLoading, setIsLoading] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationLockRef = useRef(false);
  const gpsFallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any,
  });

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
        }
      } else {
        console.error('Geocoding API error:', await response.text());
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  }, []);

  // Get current location with improved accuracy handling
  const getCurrentLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported. Please enter your location manually.');
      setIsLoading(false);
      const defaultLoc = { lat: -17.8292, lng: 31.0522 };
      setCurrentLocation(defaultLoc);
      setMapCenter(defaultLoc);
      return;
    }

    setIsLoading(true);
    setGpsAccuracy(null);
    locationLockRef.current = false;

    // stop previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // clear previous fallback timer
    if (gpsFallbackTimerRef.current) {
      clearTimeout(gpsFallbackTimerRef.current);
      gpsFallbackTimerRef.current = null;
    }

    const GOOD_ACCURACY_METERS = 60;      // phone outdoors usually 5-30m
    const OK_ACCURACY_METERS = 150;       // decent for city pickup
    const MAX_WAIT_MS = 20000;

    let bestPos: GeolocationPosition | null = null;

    const acceptPosition = (pos: GeolocationPosition, final = false) => {
      const { latitude, longitude, accuracy } = pos.coords;

      const loc = { lat: latitude, lng: longitude };
      setCurrentLocation(loc);
      setMapCenter(loc);
      setGpsAccuracy(typeof accuracy === 'number' ? accuracy : null);

      if (final) {
        reverseGeocode(loc); // Fetch and set the address
        setIsLoading(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }
    };

    const onUpdate = (pos: GeolocationPosition) => {
      const acc = pos.coords.accuracy;

      // keep best
      if (!bestPos || (typeof acc === 'number' && acc < bestPos.coords.accuracy)) {
        bestPos = pos;
      }

      // Only update UI live if it's not totally trash
      if (typeof acc === 'number' && acc <= 2000) {
        acceptPosition(pos, false);
      }

      // lock only if good enough
      if (!locationLockRef.current && typeof acc === 'number' && acc <= GOOD_ACCURACY_METERS) {
        locationLockRef.current = true;
        toast.success(`Accurate location found (${Math.round(acc)}m)`);
        acceptPosition(pos, true);
      }
    };

    const onError = (error: GeolocationPositionError) => {
      console.error('Error getting location:', error);

      let msg = 'Could not get your location. ';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg += 'Please allow location access (Precise location if on Android).';
          break;
        case error.POSITION_UNAVAILABLE:
          msg += 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          msg += 'Location request timed out.';
          break;
        default:
          msg += 'An unknown error occurred.';
      }

      toast.error(msg);
      setIsLoading(false);

      const defaultLoc = { lat: -17.8292, lng: 31.0522 };
      setCurrentLocation(defaultLoc);
      setMapCenter(defaultLoc);
      reverseGeocode(defaultLoc); // Set address for default location

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };

    // 1) fast first hit (sometimes decent)
    navigator.geolocation.getCurrentPosition(onUpdate, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000,
    });

    // 2) refine over time
    watchIdRef.current = navigator.geolocation.watchPosition(onUpdate, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000,
    });

    // 3) after MAX_WAIT, only accept if at least "OK"
    gpsFallbackTimerRef.current = setTimeout(() => {
      if (locationLockRef.current) return;

      if (bestPos && typeof bestPos.coords.accuracy === 'number') {
        const acc = bestPos.coords.accuracy;

        if (acc <= OK_ACCURACY_METERS) {
          toast(`Using best available location (${Math.round(acc)}m). Drag the pin if needed.`, { icon: '📍' });
          acceptPosition(bestPos, true);
        } else {
          // IMPORTANT: don't pretend it's correct
          toast.error(
            `Location accuracy is too low (${Math.round(acc)}m). Please turn on GPS / move outside, type your location, or drag the pin on the map.`
          );
          setIsLoading(false);
          // Still set location so user can drag it
          if (bestPos) {
            const { latitude, longitude } = bestPos.coords;
            const loc = { lat: latitude, lng: longitude };
            setCurrentLocation(loc);
            setMapCenter(loc);
            reverseGeocode(loc);
          }
        }
      } else {
        toast.error('Could not get a reliable GPS fix. Please type your location or drag the pin.');
        setIsLoading(false);
        const defaultLoc = { lat: -17.8292, lng: 31.0522 };
        setCurrentLocation(defaultLoc);
        setMapCenter(defaultLoc);
        reverseGeocode(defaultLoc);
      }
    }, MAX_WAIT_MS);
  }, [reverseGeocode]);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Cleanup timeout and geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (gpsFallbackTimerRef.current) {
        clearTimeout(gpsFallbackTimerRef.current);
        gpsFallbackTimerRef.current = null;
      }
    };
  }, []);

  // Handle current location input with autocomplete
  const handleCurrentLocationInput = async (value: string) => {
    // If user is typing manually, stop GPS updates
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
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
              includedRegionCodes: ['ZW'], // Zimbabwe
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
          
          toast.success(`Route calculated: ${distanceInKm.toFixed(2)} km`);
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
      const basePrice = distance * 0.60; // $0.60 per km
      const finalPrice = isRoundTrip ? basePrice * 2 : basePrice;
      setSuggestedPrice(finalPrice);
      setAdjustedPrice(finalPrice);
    }
  }, [isRoundTrip, distance]);

  // Recalculate route when current location becomes available and destination is set
  useEffect(() => {
    if (currentLocation && destinationCoords && isLoaded) {
      console.log('Recalculating route with current location:', currentLocation, 'and destination:', destinationCoords);
      calculateRoute();
    }
  }, [currentLocation, destinationCoords, isLoaded, calculateRoute]);

  const handleIncreasePrice = () => {
    setAdjustedPrice(prev => prev + 0.50);
  };

  const handleDecreasePrice = () => {
    const minPrice = suggestedPrice - 1;
    if (adjustedPrice > minPrice) {
      setAdjustedPrice(prev => Math.max(minPrice, prev - 0.50));
    } else {
      toast.error('Cannot decrease price more than $1 below suggested price');
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
            reverseGeocode(newPos); // Update address via reverse geocoding
            toast.success('Location adjusted');
            // Route will recalculate automatically via useEffect
          }
        });

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
  }, [currentLocation, destinationCoords, isLoaded, updateMarkers]);

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
          <p className="text-white/70">Please check your API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center">
        <div className="text-white text-xl">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nexryde-yellow-darker">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Map */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={currentLocation ? 13 : 10}
              onLoad={handleMapLoad}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
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

          {/* Location Inputs */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 space-y-4">
            {/* Current Location */}
            <div className="relative">
              <label className="block text-white/70 text-sm font-medium mb-2">
                From (Current Location)
              </label>
              <div className="relative flex items-center space-x-2">
                <div className="relative flex-1">
                  <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                  <input
                    type="text"
                    value={currentLocationAddress || (currentLocation ? `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}` : 'Getting location...')}
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
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                  />
                  {/* Current Location Suggestions */}
                  {showCurrentLocationSuggestions && currentLocationSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white rounded-xl shadow-2xl border border-white/20 max-h-60 overflow-y-auto">
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
                <button
                  onClick={getCurrentLocation}
                  className="px-4 py-3 bg-nexryde-yellow text-white rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 whitespace-nowrap"
                  title="Use GPS location"
                >
                  📍 GPS
                </button>
              </div>
              {/* GPS Accuracy Display */}
              {gpsAccuracy !== null && (
                <p className="mt-2 text-xs text-white/60">
                  GPS accuracy: ~{Math.round(gpsAccuracy)}m
                </p>
              )}
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block text-white/70 text-sm font-medium mb-2">
                To (Destination)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
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
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
                {showSuggestions && autocompleteSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 max-h-60 overflow-y-auto">
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
                          className="w-full text-left px-4 py-3 hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0"
                        >
                          <p className="text-gray-800 font-medium">{text}</p>
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
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-nexryde-yellow focus:ring-2 focus:ring-nexryde-yellow focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-medium text-white/70">Round Trip</span>
                </div>
              </label>
            </div>
          </div>

          {/* Distance and Price */}
          {(distance > 0 || destinationCoords) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Distance:</span>
                  <span className="text-white font-semibold">{distance.toFixed(2)} km</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Suggested Price:</span>
                  <span className="text-white font-semibold">${suggestedPrice.toFixed(2)}</span>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-medium">Your Price:</span>
                    <span className="text-nexryde-yellow font-bold text-xl">${adjustedPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={handleDecreasePrice}
                      disabled={adjustedPrice <= suggestedPrice - 1}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-white/70 text-sm">Adjust price</span>
                    <button
                      onClick={handleIncreasePrice}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <Plus className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                <button
                  className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 mt-4"
                >
                  Confirm Booking
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

