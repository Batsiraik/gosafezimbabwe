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
import { IconArrowBack, IconBicycle, IconLocation } from '@/components/DashboardIcons';
import { safeBack } from '@/lib/safe-back';
import { getToken } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverParcelApi } from '@/lib/api';

type ParcelItem = {
  id: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  distance?: number;
  price?: number;
  finalPrice?: number | null;
  status: string;
  createdAt?: string;
  user?: { fullName?: string; phone?: string };
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusStyle(status: string): { bg: string; text: string } {
  switch (status) {
    case 'completed': return { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' };
    case 'in_progress': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd' };
    case 'accepted': return { bg: 'rgba(250, 204, 21, 0.2)', text: '#facc15' };
    case 'cancelled': return { bg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' };
    default: return { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.8)' };
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In Progress';
    case 'accepted': return 'Accepted';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

export default function DriverParcelHistoryScreen() {
  const [parcels, setParcels] = useState<ParcelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchHistory = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverParcelApi.history(token);
      setParcels((data.parcels as ParcelItem[]) || []);
    } catch (_) {
      setParcels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = filter === 'all' ? parcels : parcels.filter((p) => p.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/driver/parcel/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History</Text>
      </View>

      <View style={styles.filterRow}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filter === opt.value && styles.filterChipActive]}
            onPress={() => setFilter(opt.value)}
          >
            <Text style={[styles.filterChipText, filter === opt.value && styles.filterChipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <IconBicycle color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No deliveries found</Text>
            </View>
          ) : (
            filtered.map((p) => {
              const st = getStatusStyle(p.status);
              return (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.text }]}>{formatStatus(p.status)}</Text>
                    </View>
                    <Text style={styles.price}>${(p.finalPrice ?? p.price ?? 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.addressRow}>
                    <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                    <Text style={styles.address}>{p.pickupAddress}</Text>
                  </View>
                  <View style={styles.addressRow}>
                    <IconLocation color="rgba(255,255,255,0.7)" size={14} />
                    <Text style={styles.addressMuted}>{p.deliveryAddress}</Text>
                  </View>
                  {p.distance != null && <Text style={styles.meta}>Distance: {p.distance.toFixed(1)} km</Text>}
                  {p.user?.fullName && <Text style={styles.meta}>Sender: {p.user.fullName}</Text>}
                </View>
              );
            })
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: spacing.md },
  filterChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  filterChipTextActive: { color: colors.background, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { color: 'rgba(255,255,255,0.6)', marginTop: spacing.sm },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  price: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  address: { color: '#fff', fontSize: 14 },
  addressMuted: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  meta: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
});
