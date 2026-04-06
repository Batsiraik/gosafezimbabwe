import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  Switch,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  IconSettings,
  IconPerson,
  IconClock,
  IconCheckmarkCircle,
  IconCalendar,
  IconStar,
  IconCar,
  IconLocation,
  IconCloseCircle,
  IconNavigate,
  IconCall,
  IconPower,
} from '@/components/DashboardIcons';
import { getToken } from '@/lib/storage';
import { setUserMode, clearUserMode } from '@/lib/storage';
import { getPushToken } from '@/lib/push-notifications';
import { colors, spacing } from '@/lib/theme';
import { driverTaxiApi, settingsApi, type DriverTaxiProfile } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';

type PendingRide = {
  id: string;
  pickupAddress?: string;
  destinationAddress?: string;
  price?: number;
  /** Admin rate × distance at booking */
  recommendedPrice?: number | null;
  distance?: number;
  distanceFromDriver?: number;
  isRoundTrip?: boolean;
  user?: { fullName?: string; phone?: string };
};
type PendingBid = {
  id: string;
  bidPrice?: number;
  rideRequest?: {
    id: string;
    pickupAddress?: string;
    destinationAddress?: string;
    price?: number;
    distance?: number;
    user?: { fullName?: string; phone?: string };
  };
};
type AcceptedRide = {
  id: string;
  status?: string;
  driverId?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  price?: number;
  finalPrice?: number;
  distance?: number;
  user?: { fullName?: string; phone?: string };
};

export default function DriverTaxiDashboardScreen() {
  const [driver, setDriver] = useState<DriverTaxiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [pendingBids, setPendingBids] = useState<PendingBid[]>([]);
  const [acceptedRides, setAcceptedRides] = useState<AcceptedRide[]>([]);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [selectedRide, setSelectedRide] = useState<PendingRide | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [placingBid, setPlacingBid] = useState(false);

  const loadStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverTaxiApi.status(token);
      if (data.driver) {
        await setUserMode('taxi');
        setDriver(data.driver);
        return data.driver;
      }
      await clearUserMode();
      router.replace('/driver/taxi/register');
      return null;
    } catch (_) {
      router.replace('/driver/taxi/register');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authToken = await getToken();
      const push = await getPushToken();
      if (cancelled || !authToken || !push?.token) return;
      try {
        await settingsApi.pushToken(authToken, push.token);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchData = useCallback(async () => {
    const token = await getToken();
    const d = driver;
    if (!token || !d || !d.isVerified) return;
    if (!d.isOnline) {
      setPendingRides([]);
      setPendingBids([]);
      return;
    }
    try {
      const coords = await getCurrentCoords();
      const lat = coords?.lat ?? -17.8292;
      const lng = coords?.lng ?? 31.0522;
      await driverTaxiApi.location(token, lat, lng);
      const [ridesRes, bidsRes, historyRes] = await Promise.all([
        driverTaxiApi.pendingRides(token),
        driverTaxiApi.pendingBids(token),
        driverTaxiApi.rideHistory(token),
      ]);
      setPendingRides((ridesRes.rides as PendingRide[]) || []);
      setPendingBids((bidsRes.bids as PendingBid[]) || []);
      const history = (historyRes.rides as AcceptedRide[]) || [];
      setAcceptedRides(history.filter((r: AcceptedRide) => (r.status === 'accepted' || r.status === 'in_progress') && r.driverId === d.id));
    } catch (_) {}
  }, [driver]);

  useEffect(() => {
    if (!driver?.isVerified || !driver?.isOnline) return;
    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [driver?.id, driver?.isVerified, driver?.isOnline, fetchData]);

  // Refetch when screen gains focus (e.g. user tapped push notification and landed here)
  useFocusEffect(
    useCallback(() => {
      if (driver?.isVerified && driver?.isOnline) fetchData();
    }, [driver?.isVerified, driver?.isOnline, fetchData])
  );

  const toggleOnline = async () => {
    if (!driver) return;
    const token = await getToken();
    if (!token) return;
    setTogglingOnline(true);
    try {
      const newOnline = !driver.isOnline;
      await driverTaxiApi.onlineStatus(token, newOnline);
      if (newOnline) {
        const coords = await getCurrentCoords();
        await driverTaxiApi.location(token, coords?.lat ?? -17.8292, coords?.lng ?? 31.0522);
      }
      setDriver({ ...driver, isOnline: newOnline });
      if (newOnline) fetchData();
      else setPendingRides([]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setTogglingOnline(false);
    }
  };

  const placeBid = async () => {
    if (!selectedRide || !bidPrice.trim()) {
      Alert.alert('Error', 'Enter a bid price');
      return;
    }
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter a valid bid price');
      return;
    }
    const token = await getToken();
    if (!token) return;
    setPlacingBid(true);
    try {
      await driverTaxiApi.placeBid(token, { rideId: selectedRide.id, bidPrice: price });
      setSelectedRide(null);
      setBidPrice('');
      fetchData();
      Alert.alert('Success', 'Bid placed. Waiting for customer to accept.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to place bid');
    } finally {
      setPlacingBid(false);
    }
  };

  const startRide = async (rideId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await driverTaxiApi.startRide(token, rideId);
      fetchData();
      Alert.alert('Success', 'Ride started.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start ride');
    }
  };

  const endRide = async (rideId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await driverTaxiApi.endRide(token, rideId);
      fetchData();
      Alert.alert('Success', 'Ride completed.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end ride');
    }
  };

  const callUser = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openMaps = (lat?: number, lng?: number) => {
    if (lat != null && lng != null) {
      const url = Platform.OS === 'ios'
        ? `https://maps.apple.com/?daddr=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  const switchToUser = async () => {
    await clearUserMode();
    router.replace('/dashboard');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!driver) return null;

  // ----- Waiting for Verification (not approved) -----
  if (!driver.isVerified) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hi Driver</Text>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/settings')}>
              <IconSettings color="#fff" size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchUserBtn} onPress={switchToUser}>
              <IconPerson color={colors.primary} size={20} />
              <Text style={styles.switchUserText}>Switch to User</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.verifyContent} showsVerticalScrollIndicator={false}>
          <View style={styles.verifyCard}>
            <View style={styles.verifyIconWrap}>
              <IconClock color={colors.primary} size={36} />
            </View>
            <Text style={styles.verifyTitle}>Waiting for Verification</Text>
            <Text style={styles.verifyBody}>
              Your driver registration documents have been submitted and are currently under review.
            </Text>
            <Text style={styles.verifySub}>
              Verification may take a few hours. You will be able to start accepting rides once your documents are approved by our admin team.
            </Text>
            <View style={styles.docList}>
              <Text style={styles.docListTitle}>Documents Submitted:</Text>
              <View style={styles.docRow}>
                <IconCheckmarkCircle color="#4ade80" size={18} />
                <Text style={styles.docRowText}>Driver License: {driver.licenseNumber}</Text>
              </View>
              <View style={styles.docRow}>
                <IconCheckmarkCircle color="#4ade80" size={18} />
                <Text style={styles.docRowText}>Car Registration: {driver.carRegistration}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.backSettingsBtn} onPress={() => router.push('/settings')}>
              <Text style={styles.backSettingsText}>Back to Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ----- Verified: Main dashboard -----
  return (
    <View style={styles.container}>
      {/* Header: History | Settings | Switch to User */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/driver/taxi/history')}>
          <IconCalendar color="#fff" size={20} />
          <Text style={styles.headerLeftBtnText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/settings')}>
          <IconSettings color="#fff" size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.switchUserBtn} onPress={switchToUser}>
          <IconPerson color={colors.primary} size={20} />
          <Text style={styles.switchUserText}>Switch to User</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { loadStatus(); fetchData(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Driver Profile card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.profileLeft}>
              <Text style={styles.cardTitle}>Driver Profile</Text>
              <Text style={styles.cardRow}>License: {driver.licenseNumber}</Text>
              <Text style={styles.cardRow}>Car Registration: {driver.carRegistration}</Text>
              {driver.averageRating !== undefined && driver.totalRatings !== undefined && (
                <View style={styles.ratingRow}>
                  <IconStar color={colors.primary} size={16} />
                  <Text style={styles.ratingText}>
                    {driver.averageRating > 0 ? driver.averageRating.toFixed(1) : '0.0'} ({driver.totalRatings} {driver.totalRatings === 1 ? 'rating' : 'ratings'})
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.verifiedBadge}>
              <IconCheckmarkCircle color="#4ade80" size={16} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          {/* Status toggle */}
          <View style={styles.statusSection}>
            <View style={styles.statusLeft}>
              <IconPower
                color={driver.isOnline ? '#4ade80' : 'rgba(255,255,255,0.5)'}
                size={20}
              />
              <View>
                <Text style={styles.statusLabel}>Status</Text>
                <View style={styles.statusDotRow}>
                  <View style={[styles.statusDot, driver.isOnline && styles.statusDotOn]} />
                  <Text style={styles.statusValue}>{driver.isOnline ? 'Online' : 'Offline'}</Text>
                </View>
              </View>
            </View>
            <Switch
              value={driver.isOnline}
              onValueChange={toggleOnline}
              disabled={togglingOnline}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          {!driver.isOnline && (
            <Text style={styles.statusHint}>Turn on to start receiving ride requests</Text>
          )}
          <TouchableOpacity
            style={styles.updateVehicleBtn}
            onPress={() => router.push('/driver/taxi/update-vehicle')}
          >
            <IconCar color={colors.primary} size={18} />
            <Text style={styles.updateVehicleBtnText}>Update your vehicle details</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Rides (Within 10km) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Pending Rides (Within 10km)</Text>
            <TouchableOpacity
              onPress={fetchData}
              disabled={!driver.isOnline}
              style={styles.refreshBtn}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {!driver.isOnline ? (
            <View style={styles.emptyState}>
              <IconCar color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>Go online to see pending rides</Text>
            </View>
          ) : pendingRides.length === 0 ? (
            <View style={styles.emptyState}>
              <IconCar color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No pending rides within 10km</Text>
            </View>
          ) : (
            <View style={styles.rideList}>
              {pendingRides.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.rideCard, selectedRide?.id === r.id && styles.rideCardSelected]}
                  onPress={() => { setSelectedRide(r); setBidPrice(String(r.price ?? '')); }}
                  activeOpacity={0.8}
                >
                  <View style={styles.rideCardContent}>
                    <View style={styles.rideAddressRow}>
                      <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                      <Text style={styles.rideAddress}>{r.pickupAddress}</Text>
                    </View>
                    <View style={styles.rideAddressRow}>
                      <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                      <Text style={styles.rideAddressMuted}>{r.destinationAddress}</Text>
                    </View>
                    <View style={styles.rideMeta}>
                      <Text style={styles.rideMetaText}>Distance: {r.distance?.toFixed(1) ?? '—'} km</Text>
                      {r.distanceFromDriver != null && (
                        <Text style={styles.rideMetaText}> • {r.distanceFromDriver.toFixed(1)} km away</Text>
                      )}
                      {r.isRoundTrip && <Text style={styles.rideMetaText}> • Round Trip</Text>}
                    </View>
                  </View>
                  <View style={styles.ridePriceWrap}>
                    <Text style={styles.ridePrice}>${(r.price ?? 0).toFixed(2)}</Text>
                    <Text style={styles.ridePriceLabel}>Passenger offer</Text>
                    {r.recommendedPrice != null && (
                      <Text style={styles.rideRecSmall}>Rec. ${r.recommendedPrice.toFixed(2)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Pending Bids */}
        {pendingBids.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Pending Bids</Text>
            {pendingBids.map((b) => (
              <View key={b.id} style={styles.bidCard}>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddress}>{b.rideRequest?.pickupAddress}</Text>
                </View>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddressMuted}>{b.rideRequest?.destinationAddress}</Text>
                </View>
                <View style={styles.bidMeta}>
                  <View style={styles.waitingBadge}>
                    <IconClock color={colors.primary} size={12} />
                    <Text style={styles.waitingText}>Waiting</Text>
                  </View>
                  <Text style={styles.ridePrice}>${(b.bidPrice ?? 0).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accepted Rides */}
        {acceptedRides.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accepted Rides</Text>
            {acceptedRides.map((r) => (
              <View key={r.id} style={styles.acceptedCard}>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddress}>{r.pickupAddress}</Text>
                </View>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddressMuted}>{r.destinationAddress}</Text>
                </View>
                <View style={styles.bidMeta}>
                  <View style={[styles.waitingBadge, styles.acceptedBadge]}>
                    <IconCheckmarkCircle color="#4ade80" size={12} />
                    <Text style={styles.acceptedBadgeText}>{r.status === 'in_progress' ? 'In Progress' : 'Accepted'}</Text>
                  </View>
                  <Text style={styles.ridePrice}>${(r.finalPrice ?? r.price ?? 0).toFixed(2)}</Text>
                </View>
                {r.status === 'accepted' && (
                  <TouchableOpacity style={styles.startRideBtn} onPress={() => startRide(r.id)}>
                    <IconCheckmarkCircle color="#fff" size={20} />
                    <Text style={styles.startRideBtnText}>Start Ride</Text>
                  </TouchableOpacity>
                )}
                {r.status === 'in_progress' && (
                  <TouchableOpacity style={styles.endRideBtn} onPress={() => endRide(r.id)}>
                    <IconCloseCircle color="#fff" size={20} />
                    <Text style={styles.endRideBtnText}>End Ride</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.acceptedActions}>
                  <TouchableOpacity style={styles.dirBtn} onPress={() => openMaps(r.pickupLat, r.pickupLng)}>
                    <IconNavigate color="#fff" size={18} />
                    <Text style={styles.dirBtnText}>Pick up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dirBtnSecondary} onPress={() => openMaps(r.destinationLat, r.destinationLng)}>
                    <IconLocation color="#93c5fd" size={18} />
                    <Text style={styles.dirBtnTextSecondary}>Destination</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.callBtn} onPress={() => callUser(r.user?.phone)}>
                  <IconCall color="#4ade80" size={18} />
                  <Text style={styles.callBtnText}>Call Passenger</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>

      {/* Place Bid Modal */}
      <Modal visible={!!selectedRide} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Place Bid</Text>
            {selectedRide && (
              <>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Passenger</Text>
                  <Text style={styles.modalValue}>{selectedRide.user?.fullName}</Text>
                  <Text style={styles.modalSub}>{selectedRide.user?.phone}</Text>
                </View>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Route</Text>
                  <Text style={styles.modalRoute}>{selectedRide.pickupAddress}</Text>
                  <Text style={styles.modalRoute}>{selectedRide.destinationAddress}</Text>
                </View>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalSub}>
                    Recommended (rate × km):{' '}
                    {selectedRide.recommendedPrice != null
                      ? `$${selectedRide.recommendedPrice.toFixed(2)}`
                      : '—'}
                  </Text>
                  <Text style={styles.modalSub}>
                    Passenger offer: ${(selectedRide.price ?? 0).toFixed(2)}
                  </Text>
                  <Text style={styles.modalLabel}>Your bid / fee ($)</Text>
                  <TextInput
                    style={styles.bidInput}
                    value={bidPrice}
                    onChangeText={setBidPrice}
                    keyboardType="decimal-pad"
                    placeholder="Enter your price"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <Text style={styles.modalSub}>Must meet admin minimum fare (same as passenger).</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setSelectedRide(null); setBidPrice(''); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, placingBid && styles.modalSubmitDisabled]}
                    onPress={placeBid}
                    disabled={placingBid}
                  >
                    {placingBid ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={styles.modalSubmitText}>Place Bid</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.text, marginTop: spacing.sm },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerLeftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerLeftBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 191, 25, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 191, 25, 0.3)',
  },
  switchUserText: { color: colors.primary, fontWeight: '600', fontSize: 15 },

  verifyContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  verifyCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  verifyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verifyTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  verifyBody: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: spacing.sm },
  verifySub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: spacing.lg },
  docList: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  docListTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  docRowText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  backSettingsBtn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  backSettingsText: { color: '#fff', fontWeight: '600' },

  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardRow: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  profileLeft: { flex: 1 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  verifiedText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  ratingText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  statusDotOn: { backgroundColor: '#4ade80' },
  statusValue: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  statusHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: spacing.sm },
  updateVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  updateVehicleBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  refreshBtn: {},
  refreshText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5 },
  emptyText: { color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm, fontSize: 15 },
  rideList: { gap: spacing.sm },
  rideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rideCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(245, 191, 25, 0.2)' },
  rideCardContent: { flex: 1 },
  rideAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rideAddress: { color: '#fff', fontWeight: '500', fontSize: 14 },
  rideAddressMuted: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  rideMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  rideMetaText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  ridePriceWrap: { marginLeft: spacing.md, alignItems: 'flex-end' },
  ridePrice: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  ridePriceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  rideRecSmall: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  bidCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.sm,
  },
  bidMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
  },
  waitingText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  acceptedBadge: { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  acceptedBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  acceptedCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    marginBottom: spacing.sm,
  },
  startRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  startRideBtnText: { color: '#fff', fontWeight: '600' },
  endRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  endRideBtnText: { color: '#fff', fontWeight: '600' },
  acceptedActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dirBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
  dirBtnText: { color: '#fff', fontWeight: '600' },
  dirBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  dirBtnTextSecondary: { color: '#93c5fd', fontWeight: '600' },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    marginTop: spacing.sm,
  },
  callBtnText: { color: '#4ade80', fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.md },
  modalBlock: { marginBottom: spacing.md },
  modalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  modalValue: { color: '#fff', fontWeight: '600' },
  modalSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  modalRoute: { color: '#fff', fontSize: 14, marginBottom: 2 },
  bidInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: spacing.md,
    color: '#fff',
    fontSize: 18,
    marginTop: 4,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modalCancelText: { color: '#fff', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { color: colors.background, fontWeight: '600' },
});
