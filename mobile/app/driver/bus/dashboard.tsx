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
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  IconSettings,
  IconPerson,
  IconClock,
  IconCheckmarkCircle,
  IconCalendar,
  IconAddCircle,
  IconBus,
} from '@/components/DashboardIcons';
import { getToken } from '@/lib/storage';
import { setUserMode, clearUserMode } from '@/lib/storage';
import { getPushToken } from '@/lib/push-notifications';
import { colors, spacing } from '@/lib/theme';
import { driverBusApi, settingsApi, type BusProviderProfile } from '@/lib/api';

type Booking = {
  id: string;
  status?: string;
  travelDate?: string;
  numberOfTickets?: number;
  totalPrice?: number;
  user?: { fullName?: string; phone?: string };
  busSchedule?: {
    fromCity?: { name?: string };
    toCity?: { name?: string };
    departureTime?: string;
    arrivalTime?: string;
    station?: string;
  };
};
type Schedule = {
  id: string;
  fromCityId?: string;
  toCityId?: string;
  departureTime?: string;
  arrivalTime?: string;
  station?: string;
  price?: number;
  totalSeats?: number;
  availableSeats?: number;
  fromCity?: { name?: string };
  toCity?: { name?: string };
};

export default function DriverBusDashboardScreen() {
  const [provider, setProvider] = useState<BusProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverBusApi.status(token);
      if (data.provider) {
        await setUserMode('bus');
        setProvider(data.provider);
        return data.provider;
      }
      await clearUserMode();
      router.replace('/driver/bus/register');
      return null;
    } catch (_) {
      router.replace('/driver/bus/register');
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
      const [bookingsRes, schedulesRes] = await Promise.all([
        driverBusApi.bookings(token),
        driverBusApi.schedules(token),
      ]);
      setBookings((bookingsRes.bookings as Booking[]) || []);
      setSchedules((schedulesRes.schedules as Schedule[]) || []);
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

  const confirmBooking = async (bookingId: string) => {
    const token = await getToken();
    if (!token) return;
    setConfirmingId(bookingId);
    try {
      await driverBusApi.confirmBooking(token, bookingId);
      fetchData();
      Alert.alert('Success', 'Ticket confirmed.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to confirm');
    } finally {
      setConfirmingId(null);
    }
  };

  const switchToUser = async () => {
    await clearUserMode();
    router.replace('/dashboard');
  };

  const formatTime = (time24?: string) => {
    if (!time24) return '—';
    const [h, m] = time24.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m ?? '00'} ${ampm}`;
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
          <Text style={styles.headerTitle}>Bus Provider</Text>
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
              Your bus provider registration documents have been submitted and are currently under review.
            </Text>
            <Text style={styles.verifySub}>
              Verification may take a few hours. You will be able to start adding bus schedules once approved.
            </Text>
            <TouchableOpacity style={styles.backSettingsBtn} onPress={() => router.push('/settings')}>
              <Text style={styles.backSettingsText}>Back to Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'all') return true;
    if (bookingFilter === 'pending') return b.status === 'pending';
    if (bookingFilter === 'confirmed') return b.status === 'confirmed';
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
              <Text style={styles.cardTitle}>Bus Service Provider</Text>
              <Text style={styles.cardRow}>Manage your bus schedules and view bookings</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <IconCheckmarkCircle color="#4ade80" size={16} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/driver/bus/schedules')}>
            <IconCalendar color="#fff" size={20} />
            <Text style={styles.secondaryBtnText}>My Schedules</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Alert.alert('Add Schedule', 'To add a new bus schedule, please use the GO SAFE web app.')}
          >
            <IconAddCircle color={colors.background} size={20} />
            <Text style={styles.primaryBtnText}>Add Bus Schedule</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Bookings for My Buses</Text>
            <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {(['all', 'pending', 'confirmed'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, bookingFilter === f && styles.filterChipActive]}
                onPress={() => setBookingFilter(f)}
              >
                <Text style={[styles.filterChipText, bookingFilter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Confirmed'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <IconBus color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            <View style={styles.bookingList}>
              {filteredBookings.map((b) => (
                <View key={b.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingRoute}>
                      {b.busSchedule?.fromCity?.name ?? '—'} → {b.busSchedule?.toCity?.name ?? '—'}
                    </Text>
                    <View style={[styles.statusBadge, b.status === 'confirmed' && styles.statusBadgeConfirmed, b.status === 'pending' && styles.statusBadgePending]}>
                      <Text style={styles.statusBadgeText}>{b.status === 'confirmed' ? 'Confirmed' : b.status === 'pending' ? 'Pending' : b.status ?? '—'}</Text>
                    </View>
                  </View>
                  <Text style={styles.bookingMeta}>
                    {b.travelDate} · {b.numberOfTickets} ticket(s) · ${(b.totalPrice ?? 0).toFixed(2)}
                  </Text>
                  <Text style={styles.bookingPassenger}>{b.user?.fullName} · {b.user?.phone}</Text>
                  {b.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.confirmBtn, confirmingId === b.id && styles.confirmBtnDisabled]}
                      onPress={() => confirmBooking(b.id)}
                      disabled={confirmingId === b.id}
                    >
                      {confirmingId === b.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <IconCheckmarkCircle color="#fff" size={18} />
                          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {schedules.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Schedules</Text>
            {schedules.slice(0, 5).map((s) => (
              <View key={s.id} style={styles.scheduleRow}>
                <Text style={styles.scheduleText}>
                  {s.fromCity?.name ?? '—'} → {s.toCity?.name ?? '—'} · {formatTime(s.departureTime)} · ${(s.price ?? 0).toFixed(2)} · {s.availableSeats ?? 0}/{s.totalSeats ?? 0} seats
                </Text>
              </View>
            ))}
            {schedules.length > 5 && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/driver/bus/schedules')}>
                <Text style={styles.linkBtnText}>View all schedules</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: spacing.xl * 2 }} />
      </ScrollView>
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
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  switchUserBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: 12, backgroundColor: 'rgba(245, 191, 25, 0.2)', borderWidth: 1, borderColor: 'rgba(245, 191, 25, 0.3)' },
  switchUserText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  verifyContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  verifyCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  verifyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(250, 204, 21, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  verifyTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  verifyBody: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: spacing.sm },
  verifySub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: spacing.lg },
  backSettingsBtn: { alignSelf: 'stretch', paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  backSettingsText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  card: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: spacing.sm },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardRow: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileLeft: { flex: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  verifiedText: { color: '#4ade80', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  secondaryBtnText: { color: '#fff', fontWeight: '600' },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary },
  primaryBtnText: { color: colors.background, fontWeight: '600' },
  refreshBtn: {},
  refreshText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  filterChipTextActive: { color: colors.background, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 1.5 },
  emptyText: { color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm, fontSize: 15 },
  bookingList: { gap: spacing.sm },
  bookingCard: { padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: spacing.sm },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bookingRoute: { color: '#fff', fontWeight: '600', fontSize: 15 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  statusBadgeConfirmed: { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  statusBadgePending: { backgroundColor: 'rgba(250, 204, 21, 0.2)' },
  statusBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  bookingMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 2 },
  bookingPassenger: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, marginTop: spacing.sm },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
  scheduleRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  scheduleText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  linkBtn: { marginTop: spacing.sm },
  linkBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
