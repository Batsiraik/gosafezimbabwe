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
  IconWrench,
  IconStar,
  IconCall,
} from '@/components/DashboardIcons';
import { getToken } from '@/lib/storage';
import { setUserMode, clearUserMode } from '@/lib/storage';
import { getPushToken } from '@/lib/push-notifications';
import { colors, spacing } from '@/lib/theme';
import { driverHomeServicesApi, settingsApi } from '@/lib/api';

type ServiceItem = { id: string; name: string; iconName?: string };
type ProviderProfile = { id: string; isVerified: boolean; services?: ServiceItem[]; averageRating?: number; totalRatings?: number };
type PendingRequest = {
  id: string;
  jobDescription?: string;
  budget?: number;
  location?: string;
  service?: { id: string; name: string; iconName?: string };
  user?: { fullName?: string; phone?: string };
};
type PendingBid = {
  id: string;
  bidPrice?: number;
  message?: string | null;
  serviceRequest?: {
    id: string;
    jobDescription?: string;
    budget?: number;
    location?: string;
    user?: { fullName?: string; phone?: string };
    service?: { name?: string };
  };
};
type AcceptedRequest = {
  id: string;
  jobDescription?: string;
  budget?: number;
  finalPrice?: number | null;
  location?: string;
  status?: string;
  user?: { fullName?: string; phone?: string };
  service?: { name?: string };
};

export default function DriverHomeServicesDashboardScreen() {
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [pendingBids, setPendingBids] = useState<PendingBid[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<AcceptedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [placingBid, setPlacingBid] = useState(false);

  const loadStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverHomeServicesApi.status(token);
      if (data.provider) {
        await setUserMode('home-services');
        setProvider(data.provider as ProviderProfile);
        return data.provider;
      }
      await clearUserMode();
      router.replace('/driver/home-services/register');
      return null;
    } catch (_) {
      router.replace('/driver/home-services/register');
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
    if (!token || !provider?.isVerified) return;
    try {
      const [pendingRes, bidsRes, acceptedRes] = await Promise.all([
        driverHomeServicesApi.pendingRequests(token),
        driverHomeServicesApi.pendingBids(token),
        driverHomeServicesApi.acceptedRequests(token),
      ]);
      setPendingRequests((pendingRes.requests as PendingRequest[]) || []);
      setPendingBids((bidsRes.bids as PendingBid[]) || []);
      setAcceptedRequests((acceptedRes.requests as AcceptedRequest[]) || []);
    } catch (_) {}
  }, [provider]);

  useEffect(() => {
    if (!provider?.isVerified) return;
    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => clearInterval(t);
  }, [provider?.id, provider?.isVerified, fetchData]);

  useFocusEffect(
    useCallback(() => {
      if (provider?.isVerified) fetchData();
    }, [provider?.isVerified, fetchData])
  );

  const placeBid = async () => {
    if (!selectedRequest || !bidPrice.trim()) {
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
      await driverHomeServicesApi.placeBid(token, {
        requestId: selectedRequest.id,
        bidPrice: price,
        message: bidMessage.trim() || undefined,
      });
      setSelectedRequest(null);
      setBidPrice('');
      setBidMessage('');
      fetchData();
      Alert.alert('Success', 'Bid placed. Waiting for customer to accept.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to place bid');
    } finally {
      setPlacingBid(false);
    }
  };

  const startRequest = async (requestId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await driverHomeServicesApi.startRequest(token, requestId);
      fetchData();
      Alert.alert('Success', 'Job started.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start');
    }
  };

  const completeRequest = async (requestId: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      await driverHomeServicesApi.completeRequest(token, requestId);
      fetchData();
      Alert.alert('Success', 'Job completed.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to complete');
    }
  };

  const callUser = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
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

  if (!provider) return null;

  if (!provider.isVerified) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Service Provider</Text>
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
              Your service provider registration documents have been submitted and are currently under review.
            </Text>
            <Text style={styles.verifySub}>
              Verification may take a few hours. You will be able to start accepting service requests once approved.
            </Text>
            {(provider as { services?: ServiceItem[] }).services && (provider as { services?: ServiceItem[] }).services!.length > 0 && (
              <View style={styles.serviceChipsWrap}>
                <Text style={styles.serviceChipsTitle}>Services You Selected:</Text>
                <View style={styles.serviceChips}>
                  {((provider as { services?: ServiceItem[] }).services || []).map((s: ServiceItem) => (
                    <View key={s.id} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{s.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.backSettingsBtn} onPress={() => router.push('/settings')}>
              <Text style={styles.backSettingsText}>Back to Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const servicesList = (provider as { services?: ServiceItem[] }).services || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeftBtn} onPress={() => router.push('/driver/home-services/history')}>
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
              <Text style={styles.cardTitle}>Service Provider Profile</Text>
              <Text style={styles.cardRow}>Services: {servicesList.map((s) => s.name).join(', ') || '—'}</Text>
              {provider.averageRating !== undefined && provider.totalRatings !== undefined && (
                <View style={styles.ratingRow}>
                  <IconStar color={colors.primary} size={16} />
                  <Text style={styles.ratingText}>
                    {provider.averageRating > 0 ? provider.averageRating.toFixed(1) : '0.0'} ({provider.totalRatings} {provider.totalRatings === 1 ? 'rating' : 'ratings'})
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.verifiedBadge}>
              <IconCheckmarkCircle color="#4ade80" size={16} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Pending Service Requests</Text>
            <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <IconWrench color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No pending service requests</Text>
            </View>
          ) : (
            <View style={styles.rideList}>
              {pendingRequests.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.rideCard, selectedRequest?.id === r.id && styles.rideCardSelected]}
                  onPress={() => { setSelectedRequest(r); setBidPrice(String(r.budget ?? '')); setBidMessage(''); }}
                  activeOpacity={0.8}
                >
                  <View style={styles.rideCardContent}>
                    <Text style={styles.rideAddress}>{r.service?.name ?? 'Service'}: {r.jobDescription}</Text>
                    {r.location ? <Text style={styles.rideAddressMuted}>{r.location}</Text> : null}
                    <View style={styles.rideMeta}>
                      <Text style={styles.rideMetaText}>Budget: ${(r.budget ?? 0).toFixed(2)}</Text>
                    </View>
                  </View>
                  <View style={styles.ridePriceWrap}>
                    <Text style={styles.ridePrice}>${(r.budget ?? 0).toFixed(2)}</Text>
                    <Text style={styles.ridePriceLabel}>Budget</Text>
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
                <Text style={styles.rideAddress}>{b.serviceRequest?.service?.name}: {b.serviceRequest?.jobDescription}</Text>
                <Text style={styles.rideAddressMuted}>{b.serviceRequest?.location}</Text>
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

        {acceptedRequests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accepted Jobs</Text>
            {acceptedRequests.map((r) => (
              <View key={r.id} style={styles.acceptedCard}>
                <Text style={styles.rideAddress}>{r.service?.name}: {r.jobDescription}</Text>
                <Text style={styles.rideAddressMuted}>{r.location}</Text>
                <View style={styles.bidMeta}>
                  <View style={[styles.waitingBadge, styles.acceptedBadge]}>
                    <IconCheckmarkCircle color="#4ade80" size={12} />
                    <Text style={styles.acceptedBadgeText}>{r.status === 'in_progress' ? 'In Progress' : 'Accepted'}</Text>
                  </View>
                  <Text style={styles.ridePrice}>${(r.finalPrice ?? r.budget ?? 0).toFixed(2)}</Text>
                </View>
                {r.status === 'accepted' && (
                  <TouchableOpacity style={styles.startRideBtn} onPress={() => startRequest(r.id)}>
                    <IconCheckmarkCircle color="#fff" size={20} />
                    <Text style={styles.startRideBtnText}>Start Job</Text>
                  </TouchableOpacity>
                )}
                {(r.status === 'accepted' || r.status === 'in_progress') && (
                  <TouchableOpacity style={styles.endRideBtn} onPress={() => completeRequest(r.id)}>
                    <IconCheckmarkCircle color="#fff" size={20} />
                    <Text style={styles.endRideBtnText}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.callBtn} onPress={() => callUser(r.user?.phone)}>
                  <IconCall color="#4ade80" size={18} />
                  <Text style={styles.callBtnText}>Call Customer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>

      <Modal visible={!!selectedRequest} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Place Bid</Text>
            {selectedRequest && (
              <>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Customer</Text>
                  <Text style={styles.modalValue}>{selectedRequest.user?.fullName}</Text>
                  <Text style={styles.modalSub}>{selectedRequest.user?.phone}</Text>
                </View>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Job</Text>
                  <Text style={styles.modalRoute}>{selectedRequest.service?.name}: {selectedRequest.jobDescription}</Text>
                  <Text style={styles.modalSub}>Budget: ${(selectedRequest.budget ?? 0).toFixed(2)}</Text>
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
                </View>
                <View style={styles.modalBlock}>
                  <Text style={styles.modalLabel}>Message (optional)</Text>
                  <TextInput
                    style={[styles.bidInput, { minHeight: 60 }]}
                    value={bidMessage}
                    onChangeText={setBidMessage}
                    placeholder="Brief message to customer"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                  />
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setSelectedRequest(null); setBidPrice(''); setBidMessage(''); }}>
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
  serviceChipsWrap: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  serviceChipsTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  serviceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(245, 191, 25, 0.2)' },
  serviceChipText: { color: colors.primary, fontSize: 13 },
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  ratingText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  rideAddressMuted: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 2 },
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
  bidInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: spacing.md, color: '#fff', fontSize: 16, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modalCancelText: { color: '#fff', fontWeight: '600' },
  modalSubmitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { color: colors.background, fontWeight: '600' },
});
