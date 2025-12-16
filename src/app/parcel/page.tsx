'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Bike, Truck, Package } from 'lucide-react';
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

type VehicleType = 'motorbike' | 'truck' | 'big-truck';

interface VehicleOption {
  id: VehicleType;
  name: string;
  description: string;
  icon: React.ReactNode;
  pricePerKm: number;
  minPrice: number;
}

const vehicleOptions: VehicleOption[] = [
  {
    id: 'motorbike',
    name: 'Motorbike',
    description: 'Small parcels, documents',
    icon: <Bike className="w-8 h-8" />,
    pricePerKm: 0.40,
    minPrice: 2.00
  },
  {
    id: 'truck',
    name: 'Truck / Mini Van',
    description: 'Medium parcels, boxes',
    icon: <Truck className="w-8 h-8" />,
    pricePerKm: 0.60,
    minPrice: 5.00
  },
  {
    id: 'big-truck',
    name: 'UD Big Truck',
    description: 'Large items, furniture',
    icon: <Package className="w-8 h-8" />,
    pricePerKm: 1.20,
    minPrice: 15.00
  }
];

export default function ParcelPage() {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [fromLocation, setFromLocation] = useState<string>('');
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [toLocation, setToLocation] = useState<string>('');
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [distance, setDistance] = useState<number>(0);
  const [suggestedPrice, setSuggestedPrice] = useState<number>(0);
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isLoading, setIsLoading] = useState(true);

  const mapRef = useRef<google.maps.Map | null>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fromMarkerRef = useRef<google.maps.Marker | null>(null);
  const toMarkerRef = useRef<google.maps.Marker | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as any,
  });

  useEffect(() => {
    if (isLoaded) {
      setIsLoading(false);
    }
  }, [isLoaded]);

  // Handle from location input with autocomplete
  const handleFromInput = async (value: string) => {
    setFromLocation(value);
    setShowFromSuggestions(value.length > 0);

    if (value.length < 2) {
      setFromSuggestions([]);
      return;
    }

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    autocompleteTimeoutRef.current = setTimeout(async () => {
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
          setFromSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error fetching from suggestions:', error);
      }
    }, 300);
  };

  // Handle to location input with autocomplete
  const handleToInput = async (value: string) => {
    setToLocation(value);
    setShowToSuggestions(value.length > 0);

    if (value.length < 2) {
      setToSuggestions([]);
      return;
    }

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    autocompleteTimeoutRef.current = setTimeout(async () => {
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
              locationBias: fromCoords ? {
                circle: {
                  center: {
                    latitude: fromCoords.lat,
                    longitude: fromCoords.lng
                  },
                  radius: 50000
                }
              } : undefined
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          setToSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error fetching to suggestions:', error);
      }
    }, 300);
  };

  // Select from location
  const selectFromLocation = async (placeId: string, text: string) => {
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
          setFromCoords(coords);
          setFromLocation(place.formattedAddress || place.displayName?.text || text);
          setShowFromSuggestions(false);
          setFromSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching from location details:', error);
      toast.error('Could not get location details');
    }
  };

  // Select to location
  const selectToLocation = async (placeId: string, text: string) => {
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
          setToCoords(coords);
          setToLocation(place.formattedAddress || place.displayName?.text || text);
          setShowToSuggestions(false);
          setToSuggestions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching to location details:', error);
      toast.error('Could not get location details');
    }
  };

  // Calculate route and distance
  const calculateRoute = useCallback(async () => {
    if (!fromCoords || !toCoords || !isLoaded) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      toast.error('Google Maps API key not configured');
      return;
    }

    try {
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
                  latitude: fromCoords.lat,
                  longitude: fromCoords.lng
                }
              }
            },
            destination: {
              location: {
                latLng: {
                  latitude: toCoords.lat,
                  longitude: toCoords.lng
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

          // Calculate price based on vehicle type
          if (selectedVehicle) {
            const vehicle = vehicleOptions.find(v => v.id === selectedVehicle);
            if (vehicle) {
              const basePrice = distanceInKm * vehicle.pricePerKm;
              const finalPrice = Math.max(basePrice, vehicle.minPrice);
              setSuggestedPrice(finalPrice);
            }
          }

          // Decode polyline for map display
          if (route.polyline?.encodedPolyline && window.google?.maps?.geometry) {
            const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline);
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
        // Fallback: Calculate straight-line distance
        const distanceInKm = calculateStraightLineDistance(fromCoords, toCoords);
        setDistance(distanceInKm);

        if (selectedVehicle) {
          const vehicle = vehicleOptions.find(v => v.id === selectedVehicle);
          if (vehicle) {
            const basePrice = distanceInKm * vehicle.pricePerKm;
            const finalPrice = Math.max(basePrice, vehicle.minPrice);
            setSuggestedPrice(finalPrice);
          }
        }

        setRoutePath([fromCoords, toCoords]);
        toast('Using estimated distance. Enable Routes API for accurate routing.', { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      const distanceInKm = calculateStraightLineDistance(fromCoords, toCoords);
      setDistance(distanceInKm);

      if (selectedVehicle) {
        const vehicle = vehicleOptions.find(v => v.id === selectedVehicle);
        if (vehicle) {
          const basePrice = distanceInKm * vehicle.pricePerKm;
          const finalPrice = Math.max(basePrice, vehicle.minPrice);
          setSuggestedPrice(finalPrice);
        }
      }

      setRoutePath([fromCoords, toCoords]);
      toast.error('Could not calculate route. Using estimated distance.');
    }
  }, [fromCoords, toCoords, selectedVehicle, isLoaded]);

  // Helper function to calculate straight-line distance
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

  // Recalculate route when locations or vehicle change
  useEffect(() => {
    if (fromCoords && toCoords && isLoaded) {
      calculateRoute();
    }
  }, [fromCoords, toCoords, selectedVehicle, isLoaded, calculateRoute]);

  // Update map center when locations change
  useEffect(() => {
    if (fromCoords && toCoords && mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(fromCoords);
      bounds.extend(toCoords);
      mapRef.current.fitBounds(bounds);
    } else if (fromCoords && mapRef.current) {
      mapRef.current.setCenter(fromCoords);
      mapRef.current.setZoom(13);
    }
  }, [fromCoords, toCoords]);

  // Update markers
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !isLoaded) return;

    // Clear existing markers
    if (fromMarkerRef.current) {
      fromMarkerRef.current.setMap(null);
      fromMarkerRef.current = null;
    }
    if (toMarkerRef.current) {
      toMarkerRef.current.setMap(null);
      toMarkerRef.current = null;
    }

    // Create from location marker
    if (fromCoords) {
      fromMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: fromCoords,
        title: 'Pickup Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });
    }

    // Create to location marker
    if (toCoords) {
      toMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: toCoords,
        title: 'Delivery Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#EA4335',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });
    }
  }, [fromCoords, toCoords, isLoaded]);

  useEffect(() => {
    if (mapRef.current && isLoaded) {
      updateMarkers();
    }
  }, [fromCoords, toCoords, isLoaded, updateMarkers]);

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    updateMarkers();
  };

  const handleConfirmBooking = () => {
    if (!selectedVehicle) {
      toast.error('Please select a vehicle type');
      return;
    }
    if (!fromCoords || !toCoords) {
      toast.error('Please select both pickup and delivery locations');
      return;
    }
    // TODO: Handle booking confirmation (backend integration)
    toast.success('Parcel booking confirmed! (Mock)');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

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
            <h1 className="text-2xl font-bold text-white">Send Parcel</h1>
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
          {/* Vehicle Type Selection */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20">
            <h2 className="text-white font-semibold text-lg mb-4">Select Vehicle Type</h2>
            <p className="text-white/70 text-sm mb-4">
              Choose a vehicle based on your parcel size and type. Select the appropriate option for the best service.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vehicleOptions.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedVehicle === vehicle.id
                      ? 'border-nexryde-yellow bg-nexryde-yellow/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`mb-3 ${selectedVehicle === vehicle.id ? 'text-nexryde-yellow' : 'text-white/70'}`}>
                      {vehicle.icon}
                    </div>
                    <h3 className="text-white font-semibold mb-1">{vehicle.name}</h3>
                    <p className="text-white/60 text-xs mb-2">{vehicle.description}</p>
                    <p className="text-nexryde-yellow text-sm font-medium">
                      ${vehicle.pricePerKm.toFixed(2)}/km
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={fromCoords && toCoords ? undefined : 10}
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
            {/* From Location */}
            <div className="relative">
              <label className="block text-white/70 text-sm font-medium mb-2">
                From (Pickup Location)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <input
                  ref={fromInputRef}
                  type="text"
                  value={fromLocation}
                  onChange={(e) => handleFromInput(e.target.value)}
                  onFocus={() => {
                    if (fromSuggestions.length > 0) {
                      setShowFromSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowFromSuggestions(false), 200);
                  }}
                  placeholder="Enter pickup location"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 max-h-60 overflow-y-auto">
                    {fromSuggestions.map((suggestion, index) => {
                      const placeId = suggestion.placePrediction?.placeId;
                      const text = suggestion.placePrediction?.text?.text || '';
                      if (!placeId) return null;
                      return (
                        <button
                          key={index}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectFromLocation(placeId, text);
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

            {/* To Location */}
            <div className="relative">
              <label className="block text-white/70 text-sm font-medium mb-2">
                To (Delivery Location)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50 z-10" />
                <input
                  ref={toInputRef}
                  type="text"
                  value={toLocation}
                  onChange={(e) => handleToInput(e.target.value)}
                  onFocus={() => {
                    if (toSuggestions.length > 0) {
                      setShowToSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowToSuggestions(false), 200);
                  }}
                  placeholder="Enter delivery location"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-nexryde-yellow focus:border-transparent"
                />
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 max-h-60 overflow-y-auto">
                    {toSuggestions.map((suggestion, index) => {
                      const placeId = suggestion.placePrediction?.placeId;
                      const text = suggestion.placePrediction?.text?.text || '';
                      if (!placeId) return null;
                      return (
                        <button
                          key={index}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectToLocation(placeId, text);
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
          </div>

          {/* Price and Booking */}
          {(distance > 0 || (fromCoords && toCoords)) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20"
            >
              <div className="space-y-4">
                {selectedVehicle && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Vehicle:</span>
                    <span className="text-white font-semibold">
                      {vehicleOptions.find(v => v.id === selectedVehicle)?.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Distance:</span>
                  <span className="text-white font-semibold">{distance.toFixed(2)} km</span>
                </div>
                {selectedVehicle && suggestedPrice > 0 && (
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-white font-medium">Total Price:</span>
                      <span className="text-nexryde-yellow font-bold text-xl">${suggestedPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleConfirmBooking}
                  disabled={!selectedVehicle || !fromCoords || !toCoords}
                  className="w-full bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
