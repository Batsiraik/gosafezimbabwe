import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getToken } from '@/lib/storage';
import { safeBack } from '@/lib/safe-back';
import { colors, spacing } from '@/lib/theme';
import { pricingApi, ridesApi, driversNearbyApi, type NearbyDriver, type RideBid } from '@/lib/api';
import {
  IconArrowBack,
  IconLocation,
  IconNavigate,
  IconCheck,
  IconSync,
  IconSearch,
  IconPhone,
  IconStar,
  IconCar,
} from '@/components/DashboardIcons';
import {
  getCurrentLocation,
  getCurrentLocationFast,
  reverseGeocode,
  geocodeAddress,
  distanceKm,
  type Coords,
  type LocationResult,
} from '@/lib/location';
import { placeAutocomplete, getPlaceDetails, type PlaceSuggestion } from '@/lib/places';
import { OSMMapView } from '@/components/OSMMapView';

// Set true once Google Maps API key is set up for Android (see MAPS_SETUP.md).
// When true: native Google map + live nearby driver markers. When false: OSM fallback (no crash if key broken).
const USE_NATIVE_MAP = true;

// For Google Maps tiles on Android: set android.config.googleMaps.apiKey in app.json.
// For address lookup (From/Destination): set extra.googleMapsApiKey in app.json (same key as Next.js NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).

const DEFAULT_CENTER: Coords = { lat: -17.8292, lng: 31.0522 };

/** Native Google map (only mounted when USE_NATIVE_MAP is true to avoid loading SDK when key is broken). */
function NativeRideMap({
  region,
  pickup,
  destinationCoords,
  nearbyDrivers,
  mapRef,
  style,
}: {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  pickup: Coords;
  destinationCoords: Coords | null;
  nearbyDrivers: NearbyDriver[];
  mapRef: React.RefObject<any>;
  style: { width: string; height: number };
}) {
  const RNM = require('react-native-maps');
  const MapView = RNM.default;
  const Marker = RNM.Marker;
  const provider = Platform.OS === 'android' ? RNM.PROVIDER_GOOGLE : undefined;
  return (
    <MapView
      ref={mapRef}
      style={[{ width: style.width, height: style.height }, styles.nativeMap]}
      initialRegion={region}
      provider={provider}
      mapType="standard"
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="You" pinColor={colors.primary} />
      {destinationCoords && (
        <Marker
          coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }}
          title="Destination"
          pinColor="#22c55e"
        />
      )}
      {nearbyDrivers.map((d) => (
        <Marker
          key={d.userId}
          coordinate={{ latitude: d.lat, longitude: d.lng }}
          title={`${d.driverName} – ${d.distance.toFixed(1)} km away`}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.driverMarkerWrap}>
            <View style={styles.driverCarIconBg}>
              <IconCar color="#F5BF19" size={32} />
            </View>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

function gpsStatusText(accuracy: number | null): { text: string; poor: boolean } {
  if (accuracy === null) return { text: 'Getting location...', poor: false };
  const m = Math.round(accuracy);
  if (accuracy <= 50) return { text: `GPS: Good (~${m}m)`, poor: false };
  if (accuracy <= 150) return { text: `GPS: Fair (~${m}m) • Move outdoors for better accuracy`, poor: true };
  return { text: `GPS: Poor (~${m}m) • Move outdoors for better accuracy`, poor: true };
}

export default function RideScreen() {
  const mapsAvailable = USE_NATIVE_MAP;
  const [currentLocation, setCurrentLocation] = useState<Coords | null>(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<Coords | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [pricePerKm, setPricePerKm] = useState(0.6);
  const [rideMinPrice, setRideMinPrice] = useState(2);
  const [riderOfferInput, setRiderOfferInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState<Record<string, unknown> | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [showGpsTips, setShowGpsTips] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [destSuggestionsLoading, setDestSuggestionsLoading] = useState(false);
  const [searchDots, setSearchDots] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [bids, setBids] = useState<RideBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [completedDismissed, setCompletedDismissed] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const mapRef = useRef<any>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPricing = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const data = await pricingApi.get(token);
      if (data.ridePricePerKm != null) setPricePerKm(data.ridePricePerKm);
      if (data.rideMinPrice != null) setRideMinPrice(data.rideMinPrice);
    } catch (_) {}
  }, []);

  const checkActiveRide = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setActiveRide(null);
      return;
    }
    try {
      const data = await ridesApi.active(token);
      const ride = data.ride ?? data.activeRide ?? null;
      setActiveRide(ride || null);
    } catch (_) {
      setActiveRide(null);
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setGpsLoading(true);
    setGpsAccuracy(null);
    try {
      // Fast path: show location in 1–2s (cache / last known / single fix)
      const fastResult = await getCurrentLocationFast();
      if (fastResult) {
        setCurrentLocation(fastResult.coords);
        setGpsAccuracy(fastResult.accuracy);
        const address = await reverseGeocode(fastResult.coords);
        setCurrentAddress(address);
        if (mapsAvailable && mapRef.current?.animateToRegion) {
          mapRef.current.animateToRegion({
            ...fastResult.coords,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }, 300);
        }
        setGpsLoading(false);
      } else {
        setCurrentLocation(DEFAULT_CENTER);
        setCurrentAddress(await reverseGeocode(DEFAULT_CENTER));
        setGpsLoading(false);
      }
      // Refine in background with accurate fix (updates when ready)
      getCurrentLocation({ preferAccurate: true }).then((result) => {
        if (result) {
          setCurrentLocation(result.coords);
          setGpsAccuracy(result.accuracy);
          reverseGeocode(result.coords).then(setCurrentAddress);
          if (mapsAvailable && mapRef.current?.animateToRegion) {
            mapRef.current.animateToRegion({
              ...result.coords,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }, 300);
          }
        }
      }).catch(() => {});
    } catch (_) {
      setCurrentLocation(DEFAULT_CENTER);
      setCurrentAddress(`Location (${DEFAULT_CENTER.lat.toFixed(4)}, ${DEFAULT_CENTER.lng.toFixed(4)})`);
      setGpsLoading(false);
    }
  }, [mapsAvailable]);

  useEffect(() => {
    fetchPricing();
    checkActiveRide();
    refreshLocation();
  }, [fetchPricing, checkActiveRide, refreshLocation]);

  // Refresh location when user returns to this screen (e.g. from background) so pickup is current
  useFocusEffect(
    useCallback(() => {
      refreshLocation();
    }, [refreshLocation])
  );

  const fetchNearbyDrivers = useCallback(async () => {
    if (!currentLocation || activeRide) return;
    try {
      const data = await driversNearbyApi.get({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        radius: 10,
        serviceType: 'taxi',
      });
      setNearbyDrivers(data.drivers ?? []);
    } catch (_) {
      setNearbyDrivers([]);
    }
  }, [currentLocation, activeRide]);

  useEffect(() => {
    if (!currentLocation || activeRide) return;
    fetchNearbyDrivers();
    const interval = setInterval(fetchNearbyDrivers, 30000);
    return () => clearInterval(interval);
  }, [currentLocation, activeRide, fetchNearbyDrivers]);

  useEffect(() => () => {
    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
  }, []);

  // Poll active ride when one exists (e.g. status updates)
  useEffect(() => {
    if (!activeRide) return;
    const interval = setInterval(() => {
      checkActiveRide();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeRide, checkActiveRide]);

  // Animate dots for "Searching..." when status is searching
  useEffect(() => {
    if ((activeRide as Record<string, unknown>)?.status === 'searching') {
      const t = setInterval(() => {
        setSearchDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
      return () => clearInterval(t);
    }
  }, [activeRide]);

  // When a new ride starts (not completed), show modal again
  useEffect(() => {
    const status = (activeRide as Record<string, unknown>)?.status as string | undefined;
    if (activeRide && status !== 'completed') setCompletedDismissed(false);
  }, [activeRide]);

  // Reset rating state when active ride id changes
  useEffect(() => {
    const id = (activeRide as Record<string, unknown>)?.id as string | undefined;
    if (!id) {
      setHasRated(false);
      setRatingStars(0);
      setReviewText('');
    }
  }, [(activeRide as Record<string, unknown>)?.id]);

  // When ride is completed, check if rider already rated the driver
  useEffect(() => {
    const ride = activeRide as Record<string, unknown> | null;
    const status = ride?.status as string | undefined;
    const rideId = ride?.id as string | undefined;
    if (!rideId || status !== 'completed' || !ride?.driver) {
      setCheckingRating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingRating(true);
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const data = await ridesApi.rateCheck(token, rideId);
        if (!cancelled) setHasRated(data.hasRated ?? false);
      } catch {
        if (!cancelled) setHasRated(false);
      } finally {
        if (!cancelled) setCheckingRating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeRide]);

  const fetchBids = useCallback(async (rideId: string) => {
    const token = await getToken();
    if (!token) return;
    setLoadingBids(true);
    try {
      const data = await ridesApi.bids(token, rideId);
      setBids(data.bids ?? []);
    } catch {
      setBids([]);
    } finally {
      setLoadingBids(false);
    }
  }, []);

  useEffect(() => {
    const ride = activeRide as Record<string, unknown> | null;
    const rideId = ride?.id as string | undefined;
    const status = ride?.status as string | undefined;
    if (status === 'bid_received' && rideId) {
      fetchBids(rideId);
      const interval = setInterval(() => fetchBids(rideId), 10000);
      return () => clearInterval(interval);
    }
    setBids([]);
  }, [activeRide, fetchBids]);

  const handleAcceptBid = useCallback(async (bidId: string) => {
    const token = await getToken();
    if (!token) return;
    setAcceptingBidId(bidId);
    try {
      await ridesApi.acceptBid(token, bidId);
      await checkActiveRide();
      Alert.alert('Driver selected', 'They will contact you soon.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept driver');
    } finally {
      setAcceptingBidId(null);
    }
  }, [checkActiveRide]);

  const handleCallDriver = useCallback((phone: string) => {
    const url = `tel:${phone.replace(/\D/g, '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open phone dialer'));
  }, []);

  const handleCancelRide = useCallback(() => {
    const ride = activeRide as { id?: string } | null;
    if (!ride?.id) return;
    Alert.alert(
      'Cancel ride?',
      'Are you sure you want to cancel this ride request?',
      [
        { text: 'Keep searching', style: 'cancel' },
        {
          text: 'Cancel ride',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            setIsCancelling(true);
            try {
              await ridesApi.cancel(token, {
                rideId: String(ride.id),
                reason: 'Changed my mind',
              });
              await checkActiveRide();
              Alert.alert('Done', 'Ride cancelled.');
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel ride');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }, [activeRide, checkActiveRide]);

  const pickup = currentLocation ?? DEFAULT_CENTER;
  const dest = destinationCoords ?? pickup;
  const distKm = distanceKm(pickup, dest);
  const effectiveKm = distKm < 0.5 ? 2 : distKm;
  /** Admin rate × distance (shown as “recommended”, based on fuel / per-km settings). */
  const recommendedPrice = Math.max(0, pricePerKm * effectiveKm * (isRoundTrip ? 2 : 1));
  /** Suggested starting offer: at least admin minimum. */
  const suggestedOffer = Math.max(rideMinPrice, recommendedPrice);

  useEffect(() => {
    if (!destinationCoords) return;
    setRiderOfferInput((prev) => {
      const n = parseFloat(String(prev).replace(',', '.'));
      if (!prev.trim() || Number.isNaN(n)) return suggestedOffer.toFixed(2);
      if (n < rideMinPrice) return suggestedOffer.toFixed(2);
      return prev;
    });
  }, [destinationCoords?.lat, destinationCoords?.lng, isRoundTrip, rideMinPrice, suggestedOffer]);

  const fetchDestSuggestions = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setDestSuggestions([]);
        setShowDestSuggestions(false);
        return;
      }
      setDestSuggestionsLoading(true);
      try {
        const list = await placeAutocomplete(value, {
          locationBias: pickup,
          regionCodes: ['ZW'],
        });
        setDestSuggestions(list);
        setShowDestSuggestions(list.length > 0);
      } catch {
        setDestSuggestions([]);
      } finally {
        setDestSuggestionsLoading(false);
      }
    },
    [pickup]
  );

  const onDestinationChangeText = useCallback(
    (text: string) => {
      setDestination(text);
      setDestinationCoords(null);
      if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
      if (!text.trim()) {
        setDestSuggestions([]);
        setShowDestSuggestions(false);
        return;
      }
      autocompleteTimeoutRef.current = setTimeout(() => fetchDestSuggestions(text), 300);
    },
    [fetchDestSuggestions]
  );

  const selectDestinationPlace = useCallback(
    async (placeId: string, text: string) => {
      setShowDestSuggestions(false);
      setDestSuggestions([]);
      setGeocodeLoading(true);
      try {
        const details = await getPlaceDetails(placeId);
        if (details) {
          setDestination(details.formattedAddress);
          setDestinationCoords({ lat: details.lat, lng: details.lng });
          if (mapsAvailable && mapRef.current?.fitToCoordinates) {
            mapRef.current.fitToCoordinates(
              [pickup, { lat: details.lat, lng: details.lng }],
              { edgePadding: { top: 80, right: 40, bottom: 280, left: 40 }, animated: true }
            );
          }
        } else {
          const coords = await geocodeAddress(text);
          if (coords) {
            setDestination(text);
            setDestinationCoords(coords);
          }
        }
      } catch (_) {
        const coords = await geocodeAddress(text);
        if (coords) {
          setDestination(text);
          setDestinationCoords(coords);
        }
      } finally {
        setGeocodeLoading(false);
      }
    },
    [pickup, mapsAvailable]
  );

  const handleSetDestination = useCallback(async () => {
    const trimmed = destination.trim();
    if (!trimmed) return;
    setShowDestSuggestions(false);
    setDestSuggestions([]);
    setGeocodeLoading(true);
    try {
      const coords = await geocodeAddress(trimmed);
      if (coords) {
        setDestinationCoords(coords);
        setDestination(trimmed);
        if (mapsAvailable && mapRef.current?.fitToCoordinates) {
          mapRef.current.fitToCoordinates([pickup, coords], { edgePadding: { top: 80, right: 40, bottom: 280, left: 40 }, animated: true });
        }
      } else {
        Alert.alert('Not found', 'Could not find that address. Try a more specific address in Zimbabwe.');
      }
    } catch (_) {
      Alert.alert('Error', 'Could not look up address.');
    } finally {
      setGeocodeLoading(false);
    }
  }, [destination, pickup, mapsAvailable]);

  const handleBook = async () => {
    setBooking(true);
    // Get freshest location right before creating ride so pickup is accurate on device
    let freshResult: LocationResult | null = null;
    let pickupAddr = currentAddress.trim();
    try {
      freshResult = await getCurrentLocation({ preferAccurate: true });
      if (freshResult) {
        const address = await reverseGeocode(freshResult.coords);
        setCurrentLocation(freshResult.coords);
        setCurrentAddress(address);
        setGpsAccuracy(freshResult.accuracy);
        pickupAddr = address;
      }
    } catch (_) {}
    const pickupCoords = freshResult?.coords ?? currentLocation ?? DEFAULT_CENTER;
    let destAddr = destination.trim();
    if (!pickupAddr || !destAddr) {
      setBooking(false);
      Alert.alert('Error', 'Enter pickup (use GPS) and destination.');
      return;
    }
    let destCoords = destinationCoords;
    if (!destCoords) {
      setGeocodeLoading(true);
      try {
        destCoords = await geocodeAddress(destAddr);
        if (destCoords) {
          setDestinationCoords(destCoords);
        } else {
          Alert.alert('Not found', 'Could not find that address. Try a more specific address in Zimbabwe.');
          setGeocodeLoading(false);
          return;
        }
      } catch (_) {
        setGeocodeLoading(false);
        Alert.alert('Error', 'Could not look up destination address.');
        return;
      }
      setGeocodeLoading(false);
    }
    const dist = distanceKm(pickupCoords, destCoords);
    const offerParsed = parseFloat(String(riderOfferInput).replace(',', '.'));
    if (Number.isNaN(offerParsed) || offerParsed < rideMinPrice - 1e-6) {
      setBooking(false);
      Alert.alert(
        'Invalid offer',
        `Enter an amount of at least $${rideMinPrice.toFixed(2)} (minimum fare).`
      );
      return;
    }
    const price = Math.round(offerParsed * 100) / 100;
    const token = await getToken();
    if (!token) {
      setBooking(false);
      router.replace('/(auth)/login');
      return;
    }
    try {
      await ridesApi.create(token, {
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        pickupAddress: pickupAddr.trim(),
        destinationLat: destCoords.lat,
        destinationLng: destCoords.lng,
        destinationAddress: destAddr,
        distance: Math.round(dist * 100) / 100,
        price,
        isRoundTrip,
      });
      await checkActiveRide();
      Alert.alert('Success', 'Ride request created. Searching for drivers...');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create ride');
    } finally {
      setBooking(false);
    }
  };

  const gpsStatus = gpsStatusText(gpsAccuracy);
  const region = {
    latitude: pickup.lat,
    longitude: pickup.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* Header – dark gold, back + "Book a Ride" */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
      </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Ride</Text>
      </View>

      {/* Map: native Google (when key set up) or OSM fallback. See MAPS_SETUP.md */}
      <View style={[StyleSheet.absoluteFill, styles.mapContainer]}>
        {mapsAvailable ? (
          <NativeRideMap
            region={region}
            pickup={pickup}
            destinationCoords={destinationCoords}
            nearbyDrivers={nearbyDrivers}
            mapRef={mapRef}
            style={{ width: '100%', height: Dimensions.get('window').height }}
          />
        ) : (
          <OSMMapView
            center={pickup}
            markers={[
              ...(currentLocation ? [{ lat: currentLocation.lat, lng: currentLocation.lng, title: 'You' }] : []),
              ...(destinationCoords ? [{ lat: destinationCoords.lat, lng: destinationCoords.lng, title: 'Destination' }] : []),
            ]}
            zoom={14}
            style={{ width: '100%', height: Dimensions.get('window').height }}
          />
        )}
      </View>

      {/* White form overlay – same layout as Next.js */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formOverlay}
      >
        <View style={styles.formCard}>
          {/* From (Current Location) */}
          <Text style={styles.label}>From (Current Location)</Text>
          <View style={styles.fromRow}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <IconLocation size={20} color="#9ca3af" />
              </View>
              <TextInput
                style={styles.input}
                value={currentAddress || 'Getting location...'}
                placeholder="Enter your location or use GPS"
                placeholderTextColor="#9ca3af"
                editable={!activeRide}
                onChangeText={setCurrentAddress}
              />
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, gpsLoading && styles.gpsBtnDisabled]}
              onPress={refreshLocation}
              disabled={!!activeRide || gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconNavigate size={20} color="#fff" />
              )}
              <Text style={styles.gpsBtnText}>GPS</Text>
      </TouchableOpacity>
            <TouchableOpacity style={styles.helpBtn} onPress={() => setShowGpsTips(true)}>
              <Text style={styles.helpBtnText}>?</Text>
            </TouchableOpacity>
          </View>
          {/* GPS status line */}
          {(gpsAccuracy !== null || gpsLoading) && (
            <View style={styles.gpsStatusRow}>
              <View style={[styles.gpsDot, gpsStatus.poor && styles.gpsDotPoor]} />
              <Text style={[styles.gpsStatusText, gpsStatus.poor && styles.gpsStatusTextPoor]}>
                {gpsLoading ? 'Getting GPS...' : gpsStatus.text}
              </Text>
            </View>
          )}

          {/* To (Destination) – with autocomplete like Next.js */}
          <Text style={styles.label}>To (Destination)</Text>
          <View style={styles.destInputWrap}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <IconLocation size={20} color="#9ca3af" />
              </View>
              <TextInput
                style={styles.input}
                value={destination}
                placeholder="Type to see suggestions"
                placeholderTextColor="#9ca3af"
                editable={!activeRide}
                onChangeText={onDestinationChangeText}
                onSubmitEditing={handleSetDestination}
                onFocus={() => destSuggestions.length > 0 && setShowDestSuggestions(true)}
              />
            </View>
            {showDestSuggestions && destSuggestions.length > 0 && (
              <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {destSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s.placeId}
                    style={styles.suggestionItem}
                    onPress={() => selectDestinationPlace(s.placeId, s.text)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText} numberOfLines={2}>{s.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {destSuggestionsLoading && (
              <View style={styles.suggestionsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.suggestionsLoadingText}>Searching...</Text>
              </View>
            )}
          </View>
          {geocodeLoading && (
            <View style={styles.geocodeLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.geocodeLoadingText}>Looking up address...</Text>
            </View>
          )}

          {/* Round Trip */}
          <TouchableOpacity
            style={styles.roundTripRow}
            onPress={() => !activeRide && setIsRoundTrip((v) => !v)}
            disabled={!!activeRide}
          >
            <View style={[styles.checkbox, isRoundTrip && styles.checkboxChecked]}>
              {isRoundTrip && <IconCheck size={16} color="#fff" />}
            </View>
            <IconSync size={18} color="#374151" style={{ marginRight: 6 }} />
            <Text style={styles.roundTripLabel}>Round Trip</Text>
          </TouchableOpacity>

          {activeRide ? null : (
            <>
              {(destinationCoords || destination.trim()) && (
                <>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>
                      {destinationCoords ? `Est. (~${distKm.toFixed(1)} km)` : 'Est. (set destination)'}
                    </Text>
                    {destinationCoords && (
                      <Text style={styles.priceMuted}>
                        Min. ${rideMinPrice.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  {destinationCoords && (
                    <>
                      <Text style={styles.recommendedLabel}>
                        Recommended (admin rate × distance)
                      </Text>
                      <Text style={styles.recommendedValue}>${recommendedPrice.toFixed(2)}</Text>
                      <Text style={styles.offerLabel}>Your offer (what you can pay)</Text>
                      <TextInput
                        style={styles.offerInput}
                        value={riderOfferInput}
                        onChangeText={setRiderOfferInput}
                        keyboardType="decimal-pad"
                        placeholder={`e.g. ${suggestedOffer.toFixed(2)}`}
                        placeholderTextColor="#9ca3af"
                      />
                      <Text style={styles.offerHint}>
                        Must be at least ${rideMinPrice.toFixed(2)}. Drivers may send their own bids.
                      </Text>
                    </>
                  )}
                </>
              )}
              <TouchableOpacity
                style={[styles.confirmBtn, (booking || !currentAddress || !destination.trim()) && styles.confirmBtnDisabled]}
                onPress={handleBook}
                disabled={booking || !currentAddress || !destination.trim()}
              >
                {booking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Active Ride Modal – bottom sheet so it doesn't overlap the form */}
      <Modal
        visible={!!activeRide && !(completedDismissed && (activeRide as Record<string, unknown>)?.status === 'completed')}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <Pressable style={styles.activeRideBackdrop}>
          <Pressable style={styles.activeRideCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.activeRideCardInner}>
              <ScrollView style={styles.activeRideScroll} contentContainerStyle={styles.activeRideScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.activeRideTitle}>Active Ride</Text>
                <TouchableOpacity style={styles.activeRideBackToDashboardBtn} onPress={() => safeBack('/dashboard')} activeOpacity={0.8}>
                  <Text style={styles.activeRideBackToDashboardText}>Back to dashboard</Text>
                  <Text style={styles.activeRideBackToDashboardSub}>Search continues in background</Text>
                </TouchableOpacity>

                {(activeRide as Record<string, unknown>)?.status === 'searching' && (
                  <View style={styles.activeRideSearching}>
                    <View style={styles.activeRideSearchIconWrap}>
                      <IconSearch color={colors.primary} size={40} />
                    </View>
                    <Text style={styles.activeRideSearchText}>
                      Searching for nearby drivers{searchDots}
                    </Text>
                    <Text style={styles.activeRideSearchSub}>Finding the closest available driver</Text>
                  </View>
                )}

                {(activeRide as Record<string, unknown>)?.status === 'bid_received' && (
                  <View style={styles.activeRideBidsSection}>
                    <Text style={styles.activeRideBidsTitle}>Drivers have placed bids</Text>
                    {loadingBids ? (
                      <View style={styles.activeRideBidsLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.activeRideBidsLoadingText}>Loading bids...</Text>
                      </View>
                    ) : bids.length === 0 ? (
                      <View style={styles.activeRideBidsEmpty}>
                        <Text style={styles.activeRideBidsEmptyText}>No bids yet</Text>
                        <Text style={styles.activeRideBidsEmptySub}>Drivers are reviewing your request...</Text>
        </View>
      ) : (
                      <View style={styles.activeRideBidsList}>
                        {bids.map((bid) => (
                          <View key={bid.id} style={styles.activeRideBidCard}>
                            <View style={styles.activeRideBidRow}>
                              <View style={styles.activeRideBidDriver}>
                                <Text style={styles.activeRideBidDriverName}>{bid.driver.user.fullName}</Text>
                                <Text style={styles.activeRideBidCar}>Car: {bid.driver.carRegistration}</Text>
                                {bid.driver.averageRating != null && bid.driver.averageRating > 0 && (
                                  <Text style={styles.activeRideBidRating}>★ {bid.driver.averageRating.toFixed(1)}{bid.driver.totalRatings ? ` (${bid.driver.totalRatings})` : ''}</Text>
                                )}
                              </View>
                              <View style={styles.activeRideBidPriceWrap}>
                                <Text style={styles.activeRideBidPrice}>${bid.bidPrice.toFixed(2)}</Text>
                                <Text style={styles.activeRideBidPriceLabel}>Bid</Text>
                              </View>
                            </View>
                            <View style={styles.activeRideBidActions}>
                              <TouchableOpacity style={styles.activeRideBidCallBtn} onPress={() => handleCallDriver(bid.driver.user.phone)}>
                                <IconPhone size={18} color="#fff" />
                                <Text style={styles.activeRideBidCallText}>Call</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.activeRideBidAcceptBtn, (acceptingBidId === bid.id || acceptingBidId !== null) && styles.activeRideBidAcceptBtnDisabled]}
                                onPress={() => handleAcceptBid(bid.id)}
                                disabled={acceptingBidId === bid.id || acceptingBidId !== null}
                              >
                                {acceptingBidId === bid.id ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <>
                                    <IconCheck size={18} color="#fff" />
                                    <Text style={styles.activeRideBidAcceptText}>Accept</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {((activeRide as Record<string, unknown>)?.status === 'accepted' || (activeRide as Record<string, unknown>)?.status === 'in_progress') && (activeRide as Record<string, unknown>)?.driver && (
                  <View style={styles.activeRideDriverSection}>
                    <Text style={styles.activeRideDriverTitle}>Your Driver</Text>
                    <View style={styles.activeRideDriverCard}>
                      <Text style={styles.activeRideDriverName}>{(activeRide as Record<string, unknown>).driver?.fullName as string}</Text>
                      <Text style={styles.activeRideDriverCar}>Car: {(activeRide as Record<string, unknown>).driver?.carRegistration as string}</Text>
                      <Text style={styles.activeRideDriverPrice}>Agreed: ${Number((activeRide as Record<string, unknown>)?.price ?? 0).toFixed(2)}</Text>
                      <TouchableOpacity style={styles.activeRideDriverCallBtn} onPress={() => handleCallDriver((activeRide as Record<string, unknown>).driver?.phone as string)}>
                        <IconPhone size={20} color="#fff" />
                        <Text style={styles.activeRideDriverCallText}>Call Driver</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {(activeRide as Record<string, unknown>)?.status === 'completed' && (
                  <View style={styles.activeRideCompletedWrap}>
                    <IconCheck size={48} color="#22c55e" />
                    <Text style={styles.activeRideCompletedText}>Ride completed</Text>
                    {checkingRating ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
                    ) : !hasRated ? (
                      <>
                        <Text style={styles.rateDriverLabel}>Rate your driver</Text>
                        <View style={styles.rateStarsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => setRatingStars(star)}
                              style={styles.rateStarBtn}
                              activeOpacity={0.8}
                            >
                              <IconStar
                                size={36}
                                color={star <= ratingStars ? '#eab308' : 'rgba(255,255,255,0.3)'}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.rateReviewInput}
                          placeholder="Review (optional)"
                          placeholderTextColor="rgba(255,255,255,0.5)"
                          value={reviewText}
                          onChangeText={setReviewText}
                          maxLength={500}
                          multiline
                          numberOfLines={3}
                        />
                        <TouchableOpacity
                          style={[styles.rateSubmitBtn, (submittingRating || ratingStars === 0) && styles.rateSubmitBtnDisabled]}
                          onPress={async () => {
                            if (ratingStars === 0 || submittingRating) return;
                            const token = await getToken();
                            const ride = activeRide as Record<string, unknown>;
                            const driver = ride?.driver as Record<string, unknown> | undefined;
                            const rateeId = (driver?.userId ?? driver?.id) as string | undefined;
                            if (!token || !(ride?.id as string) || !rateeId) {
                              Alert.alert('Error', 'Could not submit rating');
                              return;
                            }
                            setSubmittingRating(true);
                            try {
                              await ridesApi.submitRating(token, {
                                rideId: ride.id as string,
                                rateeId,
                                raterType: 'passenger',
                                rateeType: 'driver',
                                rating: ratingStars,
                                review: reviewText.trim() || null,
                              });
                              setHasRated(true);
                            } catch (e: unknown) {
                              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit rating');
                            } finally {
                              setSubmittingRating(false);
                            }
                          }}
                          disabled={submittingRating || ratingStars === 0}
                        >
                          {submittingRating ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.rateSubmitBtnText}>Submit rating</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={styles.activeRideDoneBtn} onPress={() => { setCompletedDismissed(true); checkActiveRide(); }}>
                        <Text style={styles.activeRideDoneBtnText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.activeRideDetails}>
                  <View style={styles.activeRideDetailRow}>
                    <View style={styles.activeRideDetailIcon}><IconNavigate size={18} color="#22c55e" /></View>
                    <View style={styles.activeRideDetailText}>
                      <Text style={styles.activeRideDetailLabel}>Pickup</Text>
                      <Text style={styles.activeRideDetailValue} numberOfLines={2}>
                        {(activeRide as Record<string, unknown>)?.pickupAddress as string || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activeRideDetailRow}>
                    <View style={[styles.activeRideDetailIcon, { backgroundColor: 'rgba(239,68,68,0.2)' }]}><IconLocation size={18} color="#ef4444" /></View>
                    <View style={styles.activeRideDetailText}>
                      <Text style={styles.activeRideDetailLabel}>Destination</Text>
                      <Text style={styles.activeRideDetailValue} numberOfLines={2}>
                        {(activeRide as Record<string, unknown>)?.destinationAddress as string || '—'}
                      </Text>
                    </View>
                  </View>
                </View>
    </ScrollView>

              <View style={styles.activeRideFooter}>
                <View style={styles.activeRideMetaRow}>
                  <View>
                    <Text style={styles.activeRideMetaLabel}>Distance</Text>
                    <Text style={styles.activeRideMetaValue}>
                      {Number((activeRide as Record<string, unknown>)?.distance ?? 0).toFixed(2)} km
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.activeRideMetaLabel}>Price</Text>
                    <Text style={styles.activeRidePrice}>${Number((activeRide as Record<string, unknown>)?.price ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
                {(activeRide as Record<string, unknown>)?.isRoundTrip && (
                  <View style={styles.activeRideRoundTrip}>
                    <IconSync size={16} color={colors.primary} />
                    <Text style={styles.activeRideRoundTripText}>Round Trip</Text>
                  </View>
                )}
                {activeRide && (activeRide as Record<string, unknown>).status !== 'cancelled' && (activeRide as Record<string, unknown>).status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.activeRideCancelBtn, isCancelling && styles.activeRideCancelBtnDisabled]}
                    onPress={handleCancelRide}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.activeRideCancelBtnText}>Cancel Ride</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* GPS Tips Modal – same content as Next.js */}
      <Modal
        visible={showGpsTips}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGpsTips(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowGpsTips(false)}>
          <Pressable style={styles.gpsTipsCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.gpsTipsTitle}>Improve GPS Accuracy</Text>
            <View style={styles.gpsTipsList}>
              <View style={styles.gpsTipsItem}>
                <Text style={styles.gpsTipsCheck}>✓</Text>
                <Text style={styles.gpsTipsItemText}>Move to an open area away from buildings</Text>
              </View>
              <View style={styles.gpsTipsItem}>
                <Text style={styles.gpsTipsCheck}>✓</Text>
                <Text style={styles.gpsTipsItemText}>Enable WiFi (even if not connected)</Text>
              </View>
              <View style={styles.gpsTipsItem}>
                <Text style={styles.gpsTipsCheck}>✓</Text>
                <Text style={styles.gpsTipsItemText}>Hold phone upright, not flat</Text>
              </View>
              <View style={styles.gpsTipsItem}>
                <Text style={styles.gpsTipsCheck}>✓</Text>
                <Text style={styles.gpsTipsItemText}>Wait 10–15 seconds for GPS to settle</Text>
              </View>
              <View style={styles.gpsTipsItem}>
                <Text style={styles.gpsTipsCheck}>✓</Text>
                <Text style={styles.gpsTipsItemText}>Disable battery saver mode</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.gpsTipsGotIt} onPress={() => setShowGpsTips(false)}>
              <Text style={styles.gpsTipsGotItText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(120, 90, 12, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  mapContainer: {
    backgroundColor: colors.background,
  },
  nativeMap: {
    overflow: 'hidden',
  },
  driverMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCarIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 191, 25, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F5BF19',
  },
  mapPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 12,
  },
  mapPlaceholderSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 4,
  },
  formOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    zIndex: 20,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 16,
    color: '#111827',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  gpsBtnDisabled: {
    opacity: 0.7,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  helpBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  gpsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 6,
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  gpsDotPoor: {
    backgroundColor: '#ef4444',
  },
  gpsStatusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  gpsStatusTextPoor: {
    color: '#ea580c',
  },
  roundTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roundTripLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  geocodeLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  geocodeLoadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  destInputWrap: {
    position: 'relative',
    zIndex: 1,
  },
  suggestionsList: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#111827',
  },
  suggestionsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  suggestionsLoadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  priceMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  recommendedLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  recommendedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  offerLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  offerInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  offerHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: spacing.md,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activeCard: {
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    padding: spacing.lg,
    borderRadius: 12,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  activeStatus: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
  },
  activeRideBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  activeRideCard: {
    width: '100%',
    height: Dimensions.get('window').height * 0.88,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeRideCardInner: {
    flex: 1,
    minHeight: 0,
  },
  activeRideScroll: {
    flex: 1,
    minHeight: 0,
  },
  activeRideScrollContent: {
    paddingBottom: spacing.md,
  },
  activeRideFooter: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  activeRideTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  activeRideBackToDashboardBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  activeRideBackToDashboardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  activeRideBackToDashboardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  activeRideSearching: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  activeRideSearchIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,191,25,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeRideSearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  activeRideSearchSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  activeRideStatusWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  activeRideStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  activeRideDetails: {
    marginBottom: spacing.lg,
  },
  activeRideDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: spacing.md,
  },
  activeRideDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activeRideDetailText: {
    flex: 1,
  },
  activeRideDetailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  activeRideDetailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  activeRideMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  activeRideMetaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  activeRideMetaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeRidePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  activeRideRoundTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(245,191,25,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,191,25,0.3)',
  },
  activeRideRoundTripText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  activeRideCancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeRideCancelBtnDisabled: {
    opacity: 0.7,
  },
  activeRideCancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fca5a5',
  },
  activeRideBidsSection: {
    marginBottom: spacing.lg,
  },
  activeRideBidsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.md,
  },
  activeRideBidsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.xl,
  },
  activeRideBidsLoadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  activeRideBidsEmpty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
  },
  activeRideBidsEmptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  activeRideBidsEmptySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  activeRideBidsList: {
    gap: 12,
  },
  activeRideBidCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  activeRideBidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  activeRideBidDriver: {},
  activeRideBidDriverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeRideBidCar: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  activeRideBidRating: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  activeRideBidPriceWrap: {
    alignItems: 'flex-end',
  },
  activeRideBidPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  activeRideBidPriceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  activeRideBidActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  activeRideBidCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  activeRideBidCallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeRideBidAcceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  activeRideBidAcceptBtnDisabled: {
    opacity: 0.6,
  },
  activeRideBidAcceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  activeRideDriverSection: {
    marginBottom: spacing.lg,
  },
  activeRideDriverTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  activeRideDriverCard: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  activeRideDriverName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  activeRideDriverCar: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  activeRideDriverPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  activeRideDriverCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  activeRideDriverCallText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activeRideCompletedWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  activeRideCompletedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
    marginTop: 8,
  },
  activeRideDoneBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignSelf: 'center',
  },
  activeRideDoneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rateDriverLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.md,
    marginBottom: 8,
  },
  rateStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  rateStarBtn: {
    padding: 4,
  },
  rateReviewInput: {
    width: '100%',
    minHeight: 72,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
    marginBottom: spacing.md,
    textAlignVertical: 'top',
  },
  rateSubmitBtn: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    minWidth: 140,
    alignItems: 'center',
  },
  rateSubmitBtnDisabled: {
    opacity: 0.6,
  },
  rateSubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  gpsTipsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  gpsTipsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.lg,
  },
  gpsTipsList: {
    gap: 12,
  },
  gpsTipsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  gpsTipsCheck: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '700',
  },
  gpsTipsItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  gpsTipsGotIt: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  gpsTipsGotItText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
