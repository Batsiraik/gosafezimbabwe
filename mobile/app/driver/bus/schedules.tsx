import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { IconArrowBack, IconBus } from '@/components/DashboardIcons';
import { safeBack } from '@/lib/safe-back';
import { getToken } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverBusApi } from '@/lib/api';

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
  isActive?: boolean;
  fromCity?: { name?: string };
  toCity?: { name?: string };
};

function formatTime(time24?: string) {
  if (!time24) return '—';
  const [h, m] = time24.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m ?? '00'} ${ampm}`;
}

export default function DriverBusSchedulesScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedules = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverBusApi.schedules(token);
      setSchedules((data.schedules as Schedule[]) || []);
    } catch (_) {
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/driver/bus/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedules</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSchedules(); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {schedules.length === 0 ? (
            <View style={styles.empty}>
              <IconBus color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No schedules yet. Add schedules via the web app.</Text>
            </View>
          ) : (
            schedules.map((s) => (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.route}>
                    {s.fromCity?.name ?? '—'} → {s.toCity?.name ?? '—'}
                  </Text>
                  {s.isActive === false && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Inactive</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>
                  {formatTime(s.departureTime)} {s.arrivalTime ? `– ${formatTime(s.arrivalTime)}` : ''}
                </Text>
                <Text style={styles.meta}>{s.station}</Text>
                <Text style={styles.price}>${(s.price ?? 0).toFixed(2)} · {s.availableSeats ?? 0}/{s.totalSeats ?? 0} seats</Text>
              </View>
            ))
          )}
          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { color: 'rgba(255,255,255,0.6)', marginTop: spacing.sm, textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  route: { color: '#fff', fontWeight: '600', fontSize: 16 },
  inactiveBadge: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  inactiveText: { color: '#fca5a5', fontSize: 12, fontWeight: '600' },
  meta: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 2 },
  price: { color: colors.primary, fontWeight: '600', marginTop: spacing.sm },
});
