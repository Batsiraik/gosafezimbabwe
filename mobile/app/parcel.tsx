import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { getToken } from '@/lib/storage';
import { safeBack } from '@/lib/safe-back';
import { colors, spacing } from '@/lib/theme';
import { pricingApi, parcelsApi, type ParcelBid } from '@/lib/api';
import { getCurrentLocation, getCurrentLocationFast, reverseGeocode, geocodeAddress, distanceKm, type Coords } from '@/lib/location';
import { placeAutocomplete, getPlaceDetails, type PlaceSuggestion } from '@/lib/places';
import { IconArrowBack, IconBicycle, IconLocation, IconNavigate, IconCheck, IconSearch, IconPhone, IconStar } from '@/components/DashboardIcons';
import { OSMMapView } from '@/components/OSMMapView';

// Set true once Google Maps API key is set up for Android (see MAPS_SETUP.md).
const USE_NATIVE_MAP = true;

const DEFAULT_CENTER: Coords = { lat: -17.8292, lng: 31.0522 };
const MAP_HEIGHT = 280;

/** Native Google map (only mounted when USE_NATIVE_MAP is true). */
function NativeParcelMap({
  fromCoords,
  toCoords,
  mapRef,
  style,
}: {
  fromCoords: Coords | null;
  toCoords: Coords | null;
  mapRef: React.RefObject<any>;
  style: { width: string; height: number };
}) {
  const RNM = require('react-native-maps');
  const MapView = RNM.default;
  const Marker = RNM.Marker;
  const provider = Platform.OS === 'android' ? RNM.PROVIDER_GOOGLE : undefined;
  const center = fromCoords ?? toCoords ?? DEFAULT_CENTER;
  const initialRegion = {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
  return (
    <MapView
      ref={mapRef}
      style={[{ width: '100%', height: style.height }, styles.map]}
      initialRegion={initialRegion}
      provider={provider}
      mapType="standard"
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {fromCoords && (
        <Marker coordinate={{ latitude: fromCoords.lat, longitude: fromCoords.lng }} title="Pickup" pinColor="#4285F4" />
      )}
      {toCoords && (
        <Marker coordinate={{ latitude: toCoords.lat, longitude: toCoords.lng }} title="Delivery" pinColor="#EA4335" />
      )}
    </MapView>
  );
}

export default function ParcelScreen() {
  const mapsAvailable = USE_NATIVE_MAP;
  const [fromAddress, setFromAddress] = useState('');
  const [fromCoords, setFromCoords] = useState<Coords | null>(null);
  const [toAddress, setToAddress] = useState('');
  const [toCoords, setToCoords] = useState<Coords | null>(null);
  const [pricePerKm, setPricePerKm] = useState(0.4);
  const [minPrice, setMinPrice] = useState(2);
  const [booking, setBooking] = useState(false);
  const [activeParcel, setActiveParcel] = useState<Record<string, unknown> | null>(null);
  const [completedDismissed, setCompletedDismissed] = useState(false);
  const [bids, setBids] = useState<ParcelBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [searchDots, setSearchDots] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [checkingRating, setCheckingRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<PlaceSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const mapRef = useRef<any>(null);
  const fromAutocompleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toAutocompleteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPricing = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const data = await pricingApi.get(token);
      if (data.parcelPricePerKm != null) setPricePerKm(data.parcelPricePerKm);
      if (data.parcelMinPrice != null) setMinPrice(data.parcelMinPrice);
    } catch (_) {}
  }, []);

  const checkActiveParcel = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setActiveParcel(null);
      return;
    }
    try {
      const data = await parcelsApi.active(token);
      const parcel = data.parcel ?? data.activeParcel ?? null;
      setActiveParcel(parcel || null);
    } catch (_) {
      setActiveParcel(null);
    }
  }, []);

  const fillPickupFromGps = useCallback(async () => {
    setGpsLoading(true);
    try {
      const fastResult = await getCurrentLocationFast();
      if (fastResult) {
        setFromCoords(fastResult.coords);
        const address = await reverseGeocode(fastResult.coords);
        setFromAddress(address);
        setGpsLoading(false);
      } else {
        setFromCoords(DEFAULT_CENTER);
        setFromAddress(await reverseGeocode(DEFAULT_CENTER));
        setGpsLoading(false);
      }
      getCurrentLocation({ preferAccurate: true }).then((result) => {
        if (result) {
          setFromCoords(result.coords);
          reverseGeocode(result.coords).then(setFromAddress);
        }
      }).catch(() => {});
    } catch (_) {
      setFromCoords(DEFAULT_CENTER);
      setFromAddress(`Location (${DEFAULT_CENTER.lat.toFixed(4)}, ${DEFAULT_CENTER.lng.toFixed(4)})`);
    } finally {
      setGpsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
    checkActiveParcel();
  }, [fetchPricing, checkActiveParcel]);

  // Poll for active parcel (e.g. every 5s) so status updates
  useEffect(() => {
    const t = setInterval(checkActiveParcel, 5000);
    return () => clearInterval(t);
  }, [checkActiveParcel]);

  // Animate dots when searching
  useEffect(() => {
    if ((activeParcel as Record<string, unknown>)?.status === 'searching') {
      const interval = setInterval(() => setSearchDots((prev) => (prev.length >= 3 ? '' : prev + '.')), 500);
      return () => clearInterval(interval);
    }
  }, [activeParcel]);

  // When parcel is not completed, show modal again
  useEffect(() => {
    const status = (activeParcel as Record<string, unknown>)?.status as string | undefined;
    if (activeParcel && status !== 'completed') setCompletedDismissed(false);
  }, [activeParcel]);

  // Reset rating state when active parcel id changes
  useEffect(() => {
    const id = (activeParcel as Record<string, unknown>)?.id as string | undefined;
    if (!id) {
      setHasRated(false);
      setRatingStars(0);
      setReviewText('');
    }
  }, [(activeParcel as Record<string, unknown>)?.id]);

  // Check if already rated when status is completed
  useEffect(() => {
    const p = activeParcel as Record<string, unknown> | null;
    const status = p?.status as string | undefined;
    const parcelId = p?.id as string | undefined;
    if (!parcelId || status !== 'completed' || !p?.driver) {
      setCheckingRating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingRating(true);
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const data = await parcelsApi.rateCheck(token, parcelId);
        if (!cancelled) setHasRated(data.hasRated ?? false);
      } catch {
        if (!cancelled) setHasRated(false);
      } finally {
        if (!cancelled) setCheckingRating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeParcel]);

  const fetchBids = useCallback(async (parcelId: string) => {
    const token = await getToken();
    if (!token) return;
    setLoadingBids(true);
    try {
      const data = await parcelsApi.bids(token, parcelId);
      setBids(data.bids ?? []);
    } catch {
      setBids([]);
    } finally {
      setLoadingBids(false);
    }
  }, []);

  useEffect(() => {
    const p = activeParcel as Record<string, unknown> | null;
    const status = p?.status as string | undefined;
    const parcelId = p?.id as string | undefined;
    if (status === 'bid_received' && parcelId) {
      fetchBids(parcelId);
      const interval = setInterval(() => fetchBids(parcelId), 10000);
      return () => clearInterval(interval);
    }
    setBids([]);
  }, [activeParcel, fetchBids]);

  const handleAcceptBid = useCallback(async (bidId: string) => {
    const token = await getToken();
    if (!token) return;
    setAcceptingBidId(bidId);
    try {
      await parcelsApi.acceptBid(token, bidId);
      await checkActiveParcel();
      Alert.alert('Driver selected', 'They will contact you soon.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept driver');
    } finally {
      setAcceptingBidId(null);
    }
  }, [checkActiveParcel]);

  const handleCallDriver = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => Alert.alert('Error', 'Could not open phone dialer'));
  }, []);

  const handleCancelParcel = useCallback(() => {
    const p = activeParcel as { id?: string } | null;
    if (!p?.id) return;
    Alert.alert(
      'Cancel parcel?',
      'Are you sure you want to cancel this parcel request?',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel parcel',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            setIsCancelling(true);
            try {
              await parcelsApi.cancel(token, { parcelId: String(p.id) });
              await checkActiveParcel();
              Alert.alert('Done', 'Parcel cancelled.');
            } catch (e: unknown) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel parcel');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }, [activeParcel, checkActiveParcel]);

  const from = fromCoords ?? DEFAULT_CENTER;
  const to = toCoords ?? from;

  const fetchFromSuggestions = useCallback(async (value: string) => {
    if (!value.trim()) {
      setFromSuggestions([]);
      setShowFromSuggestions(false);
      return;
    }
    const list = await placeAutocomplete(value, {
      locationBias: to,
      regionCodes: ['ZW'],
    });
    setFromSuggestions(list);
    setShowFromSuggestions(list.length > 0);
  }, [to.lat, to.lng]);

  const fetchToSuggestions = useCallback(async (value: string) => {
    if (!value.trim()) {
      setToSuggestions([]);
      setShowToSuggestions(false);
      return;
    }
    const list = await placeAutocomplete(value, {
      locationBias: from,
      regionCodes: ['ZW'],
    });
    setToSuggestions(list);
    setShowToSuggestions(list.length > 0);
  }, [from.lat, from.lng]);

  const onFromChangeText = useCallback((text: string) => {
    setFromAddress(text);
    setFromCoords(null);
    if (fromAutocompleteRef.current) clearTimeout(fromAutocompleteRef.current);
    if (!text.trim()) {
      setFromSuggestions([]);
      setShowFromSuggestions(false);
      return;
    }
    fromAutocompleteRef.current = setTimeout(() => fetchFromSuggestions(text), 300);
  }, [fetchFromSuggestions]);

  const onToChangeText = useCallback((text: string) => {
    setToAddress(text);
    setToCoords(null);
    if (toAutocompleteRef.current) clearTimeout(toAutocompleteRef.current);
    if (!text.trim()) {
      setToSuggestions([]);
      setShowToSuggestions(false);
      return;
    }
    toAutocompleteRef.current = setTimeout(() => fetchToSuggestions(text), 300);
  }, [fetchToSuggestions]);

  const selectFromPlace = useCallback(async (placeId: string, text: string) => {
    setShowFromSuggestions(false);
    setFromSuggestions([]);
    const details = await getPlaceDetails(placeId);
    if (details) {
      setFromAddress(details.formattedAddress);
      setFromCoords({ lat: details.lat, lng: details.lng });
    } else {
      const coords = await geocodeAddress(text);
      if (coords) {
        setFromAddress(text);
        setFromCoords(coords);
      }
    }
  }, []);

  const selectToPlace = useCallback(async (placeId: string, text: string) => {
    setShowToSuggestions(false);
    setToSuggestions([]);
    const details = await getPlaceDetails(placeId);
    if (details) {
      setToAddress(details.formattedAddress);
      setToCoords({ lat: details.lat, lng: details.lng });
    } else {
      const coords = await geocodeAddress(text);
      if (coords) {
        setToAddress(text);
        setToCoords(coords);
      }
    }
  }, []);

  useEffect(() => () => {
    if (fromAutocompleteRef.current) clearTimeout(fromAutocompleteRef.current);
    if (toAutocompleteRef.current) clearTimeout(toAutocompleteRef.current);
  }, []);

  const distKm = distanceKm(from, to);
  const estimatedPrice = Math.max(minPrice, pricePerKm * (distKm < 0.5 ? 2 : distKm));

  useEffect(() => {
    if (mapsAvailable && fromCoords && toCoords && mapRef.current) {
      mapRef.current.fitToCoordinates([fromCoords, toCoords], {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [mapsAvailable, fromCoords, toCoords]);

  const handleConfirm = async () => {
    let pickupAddr = fromAddress.trim();
    let deliveryAddr = toAddress.trim();
    if (!pickupAddr || !deliveryAddr) {
      Alert.alert('Error', 'Enter pickup and delivery locations.');
      return;
    }

    let pickup = fromCoords;
    let delivery = toCoords;

    setGeocodeLoading(true);
    try {
      if (!pickup) {
        pickup = await geocodeAddress(pickupAddr);
        if (pickup) {
          setFromCoords(pickup);
        } else {
          Alert.alert('Not found', 'Could not find pickup address. Try a more specific address in Zimbabwe.');
          setGeocodeLoading(false);
          return;
        }
      }
      if (!delivery) {
        delivery = await geocodeAddress(deliveryAddr);
        if (delivery) {
          setToCoords(delivery);
        } else {
          Alert.alert('Not found', 'Could not find delivery address. Try a more specific address in Zimbabwe.');
          setGeocodeLoading(false);
          return;
        }
      }
    } catch (_) {
      setGeocodeLoading(false);
      Alert.alert('Error', 'Could not look up addresses.');
      return;
    }
    setGeocodeLoading(false);

    if (!pickup || !delivery) return;
    const dist = distanceKm(pickup, delivery);
    const price = Math.max(minPrice, pricePerKm * (dist < 0.5 ? 2 : dist));

    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setBooking(true);
    try {
      await parcelsApi.create(token, {
        vehicleType: 'motorbike',
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickupAddr,
        deliveryLat: delivery.lat,
        deliveryLng: delivery.lng,
        deliveryAddress: deliveryAddr,
        distance: Math.round(dist * 100) / 100,
        price: Math.round(price * 100) / 100,
      });
      await checkActiveParcel();
      Alert.alert('Success', 'Parcel request created. Searching for drivers...');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create parcel request');
    } finally {
      setBooking(false);
    }
  };

  const hasBoth = fromCoords && toCoords;
  const canConfirm = fromAddress.trim() && toAddress.trim();

  return (
    <View style={styles.container}>
      {/* Header – dark gold, back + "Send Parcel" */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
      </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Parcel</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Motorbike Delivery card – same as Next.js */}
        <View style={styles.motorbikeCard}>
          <View style={styles.motorbikeIconWrap}>
            <IconBicycle size={32} color={colors.primary} />
          </View>
          <View style={styles.motorbikeText}>
            <Text style={styles.motorbikeTitle}>Motorbike Delivery</Text>
            <Text style={styles.motorbikeSub}>Fast and efficient parcel delivery</Text>
          </View>
        </View>

        {/* Map: native Google (when key set up) or OSM fallback. See MAPS_SETUP.md */}
        <View style={styles.mapCard}>
          {mapsAvailable ? (
            <NativeParcelMap
              fromCoords={fromCoords}
              toCoords={toCoords}
              mapRef={mapRef}
              style={{ width: '100%', height: MAP_HEIGHT }}
            />
          ) : (
            <OSMMapView
              center={from ?? to ?? DEFAULT_CENTER}
              markers={[
                ...(fromCoords ? [{ lat: fromCoords.lat, lng: fromCoords.lng, title: 'Pickup' }] : []),
                ...(toCoords ? [{ lat: toCoords.lat, lng: toCoords.lng, title: 'Delivery' }] : []),
              ]}
              zoom={14}
              style={{ width: '100%', height: MAP_HEIGHT }}
            />
          )}
        </View>

        {/* Location inputs – From / To with autocomplete */}
        <View style={styles.inputCard}>
          <Text style={styles.label}>From (Pickup Location)</Text>
          <View style={styles.fromRow}>
            <View style={styles.addressInputBlock}>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}>
                  <IconLocation size={20} color="rgba(255,255,255,0.5)" />
                </View>
                <TextInput
                  style={styles.input}
                  value={fromAddress}
                  placeholder="Type to see suggestions or use GPS"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  editable={!activeParcel}
                  onChangeText={onFromChangeText}
                />
              </View>
              {showFromSuggestions && fromSuggestions.length > 0 && (
                <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                  {fromSuggestions.map((s) => (
                    <TouchableOpacity
                      key={s.placeId}
                      style={styles.suggestionItem}
                      onPress={() => selectFromPlace(s.placeId, s.text)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>{s.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, gpsLoading && styles.gpsBtnDisabled]}
              onPress={fillPickupFromGps}
              disabled={!!activeParcel || gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconNavigate size={20} color="#fff" />
              )}
              <Text style={styles.gpsBtnText}>GPS</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: spacing.md }]}>To (Delivery Location)</Text>
          <View style={styles.addressInputBlock}>
            <View style={styles.inputWrap}>
              <View style={styles.inputIcon}>
                <IconLocation size={20} color="rgba(255,255,255,0.5)" />
              </View>
              <TextInput
                style={styles.input}
                value={toAddress}
                placeholder="Type to see suggestions"
                placeholderTextColor="rgba(255,255,255,0.5)"
                editable={!activeParcel}
                onChangeText={onToChangeText}
              />
            </View>
            {showToSuggestions && toSuggestions.length > 0 && (
              <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {toSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s.placeId}
                    style={styles.suggestionItem}
                    onPress={() => selectToPlace(s.placeId, s.text)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText} numberOfLines={2}>{s.text}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {geocodeLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Looking up addresses...</Text>
          </View>
        )}

        {/* Price and Confirm – show when both locations set or when user can confirm */}
        {(hasBoth || canConfirm) && (
          <View style={styles.priceCard}>
            {hasBoth && (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Vehicle:</Text>
                  <Text style={styles.priceValue}>Motorbike</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Distance:</Text>
                  <Text style={styles.priceValue}>{distKm.toFixed(2)} km</Text>
                </View>
                <View style={[styles.priceRow, styles.priceTotalRow]}>
                  <Text style={styles.priceTotalLabel}>Total Price:</Text>
                  <Text style={styles.priceTotal}>{hasBoth ? `$${estimatedPrice.toFixed(2)}` : '—'}</Text>
                </View>
              </>
            )}
      {activeParcel ? (
        <View style={styles.activeCard}>
                <Text style={styles.activeTitle}>Active parcel request</Text>
                <Text style={styles.activeStatus}>{(activeParcel.status as string) || 'Searching'} – tap to view</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.confirmBtn, (!canConfirm || booking) && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={!canConfirm || booking}
              >
                {booking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Active Parcel Modal – same workflow as web: searching → bids → accept → driver → completed */}
      <Modal
        visible={!!activeParcel && !(completedDismissed && (activeParcel as Record<string, unknown>)?.status === 'completed')}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <Pressable style={styles.activeParcelBackdrop}>
          <Pressable style={styles.activeParcelCard} onPress={(e) => e.stopPropagation()}>
            <ScrollView style={styles.activeParcelScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.activeParcelTitle}>Active Parcel</Text>
              <TouchableOpacity style={styles.activeParcelBackToDashboardBtn} onPress={() => safeBack('/dashboard')} activeOpacity={0.8}>
                <Text style={styles.activeParcelBackToDashboardText}>Back to dashboard</Text>
                <Text style={styles.activeParcelBackToDashboardSub}>Search continues in background</Text>
              </TouchableOpacity>

              {(activeParcel as Record<string, unknown>)?.status === 'searching' && (
                <View style={styles.activeParcelSearching}>
                  <View style={styles.activeParcelSearchIconWrap}>
                    <IconSearch color={colors.primary} size={40} />
                  </View>
                  <Text style={styles.activeParcelSearchText}>Searching for drivers{searchDots}</Text>
                  <Text style={styles.activeParcelSearchSub}>Finding the closest available driver</Text>
                </View>
              )}

              {(activeParcel as Record<string, unknown>)?.status === 'bid_received' && (
                <View style={styles.activeParcelBidsSection}>
                  <Text style={styles.activeParcelBidsTitle}>Drivers have placed bids</Text>
                  {loadingBids ? (
                    <View style={styles.activeParcelBidsLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.activeParcelBidsLoadingText}>Loading bids...</Text>
                    </View>
                  ) : bids.length === 0 ? (
                    <View style={styles.activeParcelBidsEmpty}>
                      <Text style={styles.activeParcelBidsEmptyText}>No bids yet</Text>
                      <Text style={styles.activeParcelBidsEmptySub}>Drivers are reviewing your request...</Text>
        </View>
      ) : (
                    <View style={styles.activeParcelBidsList}>
                      {bids.map((bid) => (
                        <View key={bid.id} style={styles.activeParcelBidCard}>
                          <View style={styles.activeParcelBidRow}>
                            <View style={styles.activeParcelBidDriver}>
                              <Text style={styles.activeParcelBidDriverName}>{bid.driver.user.fullName}</Text>
                              <Text style={styles.activeParcelBidCar}>Bike: {bid.driver.carRegistration}</Text>
                              {bid.driver.averageRating != null && bid.driver.averageRating > 0 && (
                                <Text style={styles.activeParcelBidRating}>★ {bid.driver.averageRating.toFixed(1)}{bid.driver.totalRatings ? ` (${bid.driver.totalRatings})` : ''}</Text>
                              )}
                            </View>
                            <View style={styles.activeParcelBidPriceWrap}>
                              <Text style={styles.activeParcelBidPrice}>${bid.bidPrice.toFixed(2)}</Text>
                              <Text style={styles.activeParcelBidPriceLabel}>Bid</Text>
                            </View>
                          </View>
                          <View style={styles.activeParcelBidActions}>
                            <TouchableOpacity style={styles.activeParcelBidCallBtn} onPress={() => handleCallDriver(bid.driver.user.phone)}>
                              <IconPhone size={18} color="#fff" />
                              <Text style={styles.activeParcelBidCallText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.activeParcelBidAcceptBtn, (acceptingBidId === bid.id || acceptingBidId !== null) && styles.activeParcelBidAcceptBtnDisabled]}
                              onPress={() => handleAcceptBid(bid.id)}
                              disabled={acceptingBidId === bid.id || acceptingBidId !== null}
                            >
                              {acceptingBidId === bid.id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <IconCheck size={18} color="#fff" />
                                  <Text style={styles.activeParcelBidAcceptText}>Accept</Text>
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

              {((activeParcel as Record<string, unknown>)?.status === 'accepted' || (activeParcel as Record<string, unknown>)?.status === 'in_progress') && (activeParcel as Record<string, unknown>)?.driver && (
                <View style={styles.activeParcelDriverSection}>
                  <Text style={styles.activeParcelDriverTitle}>Your Driver</Text>
                  <View style={styles.activeParcelDriverCard}>
                    <Text style={styles.activeParcelDriverName}>{(activeParcel as Record<string, unknown>).driver?.fullName as string}</Text>
                    <Text style={styles.activeParcelDriverCar}>Bike: {(activeParcel as Record<string, unknown>).driver?.bikeRegistration as string}</Text>
                    <Text style={styles.activeParcelDriverPrice}>Agreed: ${Number((activeParcel as Record<string, unknown>)?.price ?? 0).toFixed(2)}</Text>
                    <TouchableOpacity style={styles.activeParcelDriverCallBtn} onPress={() => handleCallDriver((activeParcel as Record<string, unknown>).driver?.phone as string)}>
                      <IconPhone size={20} color="#fff" />
                      <Text style={styles.activeParcelDriverCallText}>Call Driver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(activeParcel as Record<string, unknown>)?.status === 'completed' && (
                <View style={styles.activeParcelCompletedWrap}>
                  <IconCheck size={48} color="#22c55e" />
                  <Text style={styles.activeParcelCompletedText}>Delivery completed</Text>
                  {checkingRating ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
                  ) : !hasRated ? (
                    <>
                      <Text style={styles.rateDriverLabel}>Rate your driver</Text>
                      <View style={styles.rateStarsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => setRatingStars(star)} style={styles.rateStarBtn} activeOpacity={0.8}>
                            <IconStar size={36} color={star <= ratingStars ? '#eab308' : 'rgba(255,255,255,0.3)'} />
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
                          const p = activeParcel as Record<string, unknown>;
                          const driver = p?.driver as Record<string, unknown> | undefined;
                          const rateeId = (driver?.userId ?? driver?.id) as string | undefined;
                          if (!token || !(p?.id as string) || !rateeId) {
                            Alert.alert('Error', 'Could not submit rating');
                            return;
                          }
                          setSubmittingRating(true);
                          try {
                            await parcelsApi.submitRating(token, {
                              parcelId: p.id as string,
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
                        {submittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.rateSubmitBtnText}>Submit rating</Text>}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.activeParcelDoneBtn} onPress={() => { setCompletedDismissed(true); checkActiveParcel(); }}>
                      <Text style={styles.activeParcelDoneBtnText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.activeParcelDetails}>
                <View style={styles.activeParcelDetailRow}>
                  <View style={styles.activeParcelDetailIcon}><IconLocation size={18} color="#22c55e" /></View>
                  <View style={styles.activeParcelDetailText}>
                    <Text style={styles.activeParcelDetailLabel}>Pickup</Text>
                    <Text style={styles.activeParcelDetailValue} numberOfLines={2}>{(activeParcel as Record<string, unknown>)?.pickupAddress as string || '—'}</Text>
                  </View>
                </View>
                <View style={styles.activeParcelDetailRow}>
                  <View style={[styles.activeParcelDetailIcon, { backgroundColor: 'rgba(239,68,68,0.2)' }]}><IconLocation size={18} color="#ef4444" /></View>
                  <View style={styles.activeParcelDetailText}>
                    <Text style={styles.activeParcelDetailLabel}>Delivery</Text>
                    <Text style={styles.activeParcelDetailValue} numberOfLines={2}>{(activeParcel as Record<string, unknown>)?.deliveryAddress as string || '—'}</Text>
                  </View>
                </View>
                <View style={styles.activeParcelMetaRow}>
                  <View>
                    <Text style={styles.activeParcelMetaLabel}>Distance</Text>
                    <Text style={styles.activeParcelMetaValue}>{Number((activeParcel as Record<string, unknown>)?.distance ?? 0).toFixed(2)} km</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.activeParcelMetaLabel}>Price</Text>
                    <Text style={styles.activeParcelPrice}>${Number((activeParcel as Record<string, unknown>)?.price ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {activeParcel && (activeParcel as Record<string, unknown>).status !== 'cancelled' && (activeParcel as Record<string, unknown>).status !== 'completed' && (
                <TouchableOpacity style={[styles.activeParcelCancelBtn, isCancelling && styles.activeParcelCancelBtnDisabled]} onPress={handleCancelParcel} disabled={isCancelling}>
                  {isCancelling ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.activeParcelCancelBtnText}>Cancel Parcel</Text>}
                </TouchableOpacity>
              )}
    </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  motorbikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  motorbikeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  motorbikeText: {
    flex: 1,
  },
  motorbikeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  motorbikeSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  motorbikePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 16,
  },
  mapPlaceholder: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  mapPlaceholderSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: spacing.md,
    paddingRight: 4,
  },
  addressInputBlock: {
    flex: 1,
    minWidth: 0,
  },
  fromRowInputWrap: {
    flex: 1,
    minWidth: 0,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  gpsBtnDisabled: {
    opacity: 0.7,
  },
  gpsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  suggestionsList: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    maxHeight: 180,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  suggestionText: {
    fontSize: 14,
    color: '#111827',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: '#fff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.primary,
  },
  priceCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  priceTotalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.lg,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  priceTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
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
    color: '#fff',
  },
  activeStatus: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
  },
  activeParcelBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  activeParcelCard: {
    backgroundColor: 'rgba(120, 90, 12, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '100%',
    maxHeight: '90%',
    width: 400,
  },
  activeParcelScroll: {
    maxHeight: '100%',
    padding: spacing.lg,
  },
  activeParcelTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  activeParcelBackToDashboardBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    marginBottom: spacing.lg,
  },
  activeParcelBackToDashboardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  activeParcelBackToDashboardSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  activeParcelSearching: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  activeParcelSearchIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeParcelSearchText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  activeParcelSearchSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  activeParcelBidsSection: {
    marginBottom: spacing.lg,
  },
  activeParcelBidsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.md,
  },
  activeParcelBidsLoading: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 8,
  },
  activeParcelBidsLoadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  activeParcelBidsEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  activeParcelBidsEmptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  activeParcelBidsEmptySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  activeParcelBidsList: {
    gap: 12,
  },
  activeParcelBidCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeParcelBidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  activeParcelBidDriver: {},
  activeParcelBidDriverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeParcelBidCar: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  activeParcelBidRating: {
    fontSize: 12,
    color: '#eab308',
    marginTop: 2,
  },
  activeParcelBidPriceWrap: {
    alignItems: 'flex-end',
  },
  activeParcelBidPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  activeParcelBidPriceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  activeParcelBidActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  activeParcelBidCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  activeParcelBidCallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeParcelBidAcceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  activeParcelBidAcceptBtnDisabled: {
    opacity: 0.6,
  },
  activeParcelBidAcceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeParcelDriverSection: {
    marginBottom: spacing.lg,
  },
  activeParcelDriverTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  activeParcelDriverCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  activeParcelDriverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activeParcelDriverCar: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  activeParcelDriverPrice: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  activeParcelDriverCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  activeParcelDriverCallText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activeParcelCompletedWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  activeParcelCompletedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
    marginTop: 8,
  },
  activeParcelDoneBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignSelf: 'center',
  },
  activeParcelDoneBtnText: {
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
  activeParcelDetails: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  activeParcelDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  activeParcelDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  activeParcelDetailText: {
    flex: 1,
  },
  activeParcelDetailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  activeParcelDetailValue: {
    fontSize: 14,
    color: '#fff',
  },
  activeParcelMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  activeParcelMetaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  activeParcelMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeParcelPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  activeParcelCancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  activeParcelCancelBtnDisabled: {
    opacity: 0.7,
  },
  activeParcelCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fca5a5',
  },
});
