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
  IconBicycle,
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
import { driverParcelApi, settingsApi, type DriverParcelProfile } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';

type PendingParcel = {
  id: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  price?: number;
  distance?: number;
  distanceFromDriver?: number;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  user?: { fullName?: string; phone?: string };
};
type PendingBid = {
  id: string;
  bidPrice?: number;
  parcelRequest?: {
    id: string;
    pickupAddress?: string;
    deliveryAddress?: string;
    price?: number;
    user?: { fullName?: string; phone?: string };
  };
};
type AcceptedParcel = {
  id: string;
  status?: string;
  driverId?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  price?: number;
  finalPrice?: number;
  user?: { fullName?: string; phone?: string };
};

export default function DriverParcelDashboardScreen() {
  const [driver, setDriver] = useState<DriverParcelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingParcels, setPendingParcels] = useState<PendingParcel[]>([]);
  const [pendingBids, setPendingBids] = useState<PendingBid[]>([]);
  const [acceptedParcels, setAcceptedParcels] = useState<AcceptedParcel[]>([]);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<PendingParcel | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [placingBid, setPlacingBid] = useState(false);

  const loadStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverParcelApi.status(token);
      if (data.driver) {
        await setUserMode('parcel');
        setDriver(data.driver);
        return data.driver;
      }
      await clearUserMode();
      router.replace('/driver/parcel/register');
      return null;
    } catch (_) {
      router.replace('/driver/parcel/register');
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
      setPendingParcels([]);
      setPendingBids([]);
      return;
    }
    try {
      const coords = await getCurrentCoords();
      await driverParcelApi.location(token, coords?.lat ?? -17.8292, coords?.lng ?? 31.0522);
      const [pendingRes, bidsRes, historyRes] = await Promise.all([
        driverParcelApi.pendingParcels(token),
        driverParcelApi.pendingBids(token),
        driverParcelApi.history(token),
      ]);
      setPendingParcels((pendingRes.parcels as PendingParcel[]) || []);
      setPendingBids((bidsRes.bids as PendingBid[]) || []);
      const history = (historyRes.parcels as AcceptedParcel[]) || [];
      setAcceptedParcels(history.filter((p: AcceptedParcel) => (p.status === 'accepted' || p.status === 'in_progress') && p.driverId === d.id));
    } catch (_) {}
  }, [driver]);

  useEffect(() => {
    if (!driver?.isVerified || !driver?.isOnline) return;
    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [driver?.id, driver?.isVerified, driver?.isOnline, fetchData]);

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
      await driverParcelApi.onlineStatus(token, newOnline);
      if (newOnline) {
        const coords = await getCurrentCoords();
        await driverParcelApi.location(token, coords?.lat ?? -17.8292, coords?.lng ?? 31.0522);
      }
      setDriver({ ...driver, isOnline: newOnline });
      if (newOnline) fetchData();
      else { setPendingParcels([]); setPendingBids([]); }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setTogglingOnline(false);
    }
  };

  const placeBid = async () => {
    if (!selectedParcel || !bidPrice.trim()) {
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
      await driverParcelApi.placeBid(token, { parcelId: selectedParcel.id, bidPrice: price });
      setSelectedParcel(null);
      setBidPrice('');
      fetchData();
      Alert.alert('Success', 'Bid placed. Waiting for customer to accept.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to place bid');
    } finally {
      setPlacingBid(false);
    }
  };

  const startDelivery = async (parcelId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await driverParcelApi.startDelivery(token, parcelId);
      fetchData();
      Alert.alert('Success', 'Delivery started.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start delivery');
    }
  };

  const endDelivery = async (parcelId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await driverParcelApi.endDelivery(token, parcelId);
      fetchData();
      Alert.alert('Success', 'Delivery completed.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to complete delivery');
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

  if (!driver.isVerified) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Parcel Driver</Text>
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
              Your parcel driver registration documents have been submitted and are currently under review.
            </Text>
            <Text style={styles.verifySub}>
              Verification may take a few hours. You will be able to start accepting deliveries once approved.
            </Text>
            <View style={styles.docList}>
              <View style={styles.docRow}>
                <IconCheckmarkCircle color="#4ade80" size={18} />
                <Text style={styles.docRowText}>License: {driver.licenseNumber}</Text>
              </View>
              <View style={styles.docRow}>
                <IconCheckmarkCircle color="#4ade80" size={18} />
                <Text style={styles.docRowText}>Bike Registration: {driver.carRegistration}</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/driver/parcel/history')}>
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
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { loadStatus(); fetchData(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.profileLeft}>
              <Text style={styles.cardTitle}>Driver Profile</Text>
              <Text style={styles.cardRow}>License: {driver.licenseNumber}</Text>
              <Text style={styles.cardRow}>Bike Registration: {driver.carRegistration}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <IconCheckmarkCircle color="#4ade80" size={16} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
          <View style={styles.statusSection}>
            <View style={styles.statusLeft}>
              <IconPower color={driver.isOnline ? '#4ade80' : 'rgba(255,255,255,0.5)'} size={20} />
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
            <Text style={styles.statusHint}>Turn on to start receiving delivery requests</Text>
          )}
          <TouchableOpacity
            style={styles.updateVehicleBtn}
            onPress={() => router.push('/driver/parcel/update-vehicle')}
          >
            <IconBicycle color={colors.primary} size={18} />
            <Text style={styles.updateVehicleBtnText}>Update your vehicle details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Pending Parcels (Within 5km)</Text>
            <TouchableOpacity onPress={fetchData} disabled={!driver.isOnline} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {!driver.isOnline ? (
            <View style={styles.emptyState}>
              <IconBicycle color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>Go online to see pending parcels</Text>
            </View>
          ) : pendingParcels.length === 0 ? (
            <View style={styles.emptyState}>
              <IconBicycle color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No pending parcels within 5km</Text>
            </View>
          ) : (
            <View style={styles.rideList}>
              {pendingParcels.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.rideCard, selectedParcel?.id === p.id && styles.rideCardSelected]}
                  onPress={() => { setSelectedParcel(p); setBidPrice(String(p.price ?? '')); }}
                  activeOpacity={0.8}
                >
                  <View style={styles.rideCardContent}>
                    <View style={styles.rideAddressRow}>
                      <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                      <Text style={styles.rideAddress}>{p.pickupAddress}</Text>
                    </View>
                    <View style={styles.rideAddressRow}>
                      <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                      <Text style={styles.rideAddressMuted}>{p.deliveryAddress}</Text>
                    </View>
                    <View style={styles.rideMeta}>
                      {p.distance != null && <Text style={styles.rideMetaText}>Distance: {p.distance.toFixed(1)} km</Text>}
                      {p.distanceFromDriver != null && <Text style={styles.rideMetaText}> • {p.distanceFromDriver.toFixed(1)} km away</Text>}
                    </View>
                  </View>
                  <View style={styles.ridePriceWrap}>
                    <Text style={styles.ridePrice}>${(p.price ?? 0).toFixed(2)}</Text>
                    <Text style={styles.ridePriceLabel}>Original Price</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {pendingBids.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Pending Bids</Text>
            {pendingBids.map((b) => (
              <View key={b.id} style={styles.bidCard}>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddress}>{b.parcelRequest?.pickupAddress}</Text>
                </View>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddressMuted}>{b.parcelRequest?.deliveryAddress}</Text>
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

        {acceptedParcels.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accepted Deliveries</Text>
            {acceptedParcels.map((p) => (
              <View key={p.id} style={styles.acceptedCard}>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddress}>{p.pickupAddress}</Text>
                </View>
                <View style={styles.rideAddressRow}>
                  <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                  <Text style={styles.rideAddressMuted}>{p.deliveryAddress}</Text>
                </View>
                <View style={styles.bidMeta}>
                  <View style={[styles.waitingBadge, styles.acceptedBadge]}>
                    <IconCheckmarkCircle color="#4ade80" size={12} />
                    <Text style={styles.acceptedBadgeText}>{p.status === 'in_progress' ? 'In Progress' : 'Accepted'}</Text>
                  </View>
                  <Text style={styles.ridePrice}>${(p.finalPrice ?? p.price ?? 0).toFixed(2)}</Text>
                </View>
                {p.status === 'accepted' && (
                  <TouchableOpacity style={styles.startRideBtn} onPress={() => startDelivery(p.id)}>
                    <IconCheckmarkCircle color="#fff" size={20} />
                    <Text style={styles.startRideBtnText}>Start Delivery</Text>
                  </TouchableOpacity>
                )}
                {p.status === 'in_progress' && (
                  <TouchableOpacity style={styles.endRideBtn} onPress={() => endDelivery(p.id)}>
                    <IconCloseCircle color="#fff" size={20} />
                    <Text style={styles.endRideBtnText}>Complete Delivery</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.acceptedActions}>
                  <TouchableOpacity style={styles.dirBtn} onPress={() => openMaps(p.pickupLat, p.pickupLng)}>
                    <IconNavigate color="#fff" size={18} />
                    <Text style={styles.dirBtnText}>Pick up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dirBtnSecondary} onPress={() => openMaps(p.deliveryLat, p.deliveryLng)}>
                    <IconLocation color="#93c5fd" size={18} />
                    <Text style={styles.dirBtnTextSecondary}>Delivery</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.callBtn} onPress={() => callUser(p.user?.phone)}>
                  <IconCall color="#4ade80" size={18} />
                  <Text style={styles.callBtnText}>Call Sender</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>

      <Modal visible={!!selectedParcel} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Place Bid</Text>
            {selectedParcel && (
              <>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Sender</Text>
                  <Text style={styles.modalValue}>{selectedParcel.user?.fullName}</Text>
                  <Text style={styles.modalSub}>{selectedParcel.user?.phone}</Text>
                </View>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Route</Text>
                  <Text style={styles.modalRoute}>{selectedParcel.pickupAddress}</Text>
                  <Text style={styles.modalRoute}>{selectedParcel.deliveryAddress}</Text>
                </View>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Your bid ($)</Text>
                  <TextInput
                    style={styles.bidInput}
                    value={bidPrice}
                    onChangeText={setBidPrice}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                  <Text style={styles.modalSub}>Original: ${(selectedParcel.price ?? 0).toFixed(2)}</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setSelectedParcel(null); setBidPrice(''); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalSubmitBtn, placingBid && styles.modalSubmitDisabled]} onPress={placeBid} disabled={placingBid}>
                    {placingBid ? <ActivityIndicator size="small" color={colors.background} /> : <Text style={styles.modalSubmitText}>Place Bid</Text>}
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
  headerLeftBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerLeftBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  headerIconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  switchUserBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: 'rgba(245, 191, 25, 0.2)', borderWidth: 1, borderColor: 'rgba(245, 191, 25, 0.3)' },
  switchUserText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  verifyContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  verifyCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  verifyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(250, 204, 21, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  verifyTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  verifyBody: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: spacing.sm },
  verifySub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: spacing.lg },
  docList: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  docRowText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  backSettingsBtn: { alignSelf: 'stretch', paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  backSettingsText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  card: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardRow: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  profileLeft: { flex: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  verifiedText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  statusSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
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
  rideCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)' },
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
  bidCard: { padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: spacing.sm },
  bidMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  waitingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(250, 204, 21, 0.2)' },
  waitingText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  acceptedBadge: { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  acceptedBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  acceptedCard: { padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)', backgroundColor: 'rgba(74, 222, 128, 0.1)', marginBottom: spacing.sm },
  startRideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, marginTop: spacing.sm },
  startRideBtnText: { color: '#fff', fontWeight: '600' },
  endRideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ef4444', paddingVertical: 12, borderRadius: 12, marginTop: spacing.sm },
  endRideBtnText: { color: '#fff', fontWeight: '600' },
  acceptedActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dirBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
  dirBtnText: { color: '#fff', fontWeight: '600' },
  dirBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  dirBtnTextSecondary: { color: '#93c5fd', fontWeight: '600' },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(74, 222, 128, 0.2)', marginTop: spacing.sm },
  callBtnText: { color: '#4ade80', fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl + 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.md },
  modalBlock: { marginBottom: spacing.md },
  modalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  modalValue: { color: '#fff', fontWeight: '600' },
  modalSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  modalRoute: { color: '#fff', fontSize: 14, marginBottom: 2 },
  bidInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: spacing.md, color: '#fff', fontSize: 18, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modalCancelText: { color: '#fff', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { color: colors.background, fontWeight: '600' },
});
