import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { ridesApi } from '@/lib/api';

type RideHistoryItem = {
  id: string;
  pickupAddress: string;
  destinationAddress: string;
  distance: number;
  price: number;
  finalPrice: number | null;
  status: string;
  isRoundTrip: boolean;
  createdAt: string;
  driver?: { fullName: string; phone: string } | null;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'accepted', label: 'Accepted' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

function getStatusBadge(status: string): { text: string; bg: string; textColor: string } {
  switch (status) {
    case 'completed':
      return { text: 'Completed', bg: 'rgba(34, 197, 94, 0.2)', textColor: '#4ade80' };
    case 'cancelled':
      return { text: 'Cancelled', bg: 'rgba(239, 68, 68, 0.2)', textColor: '#f87171' };
    case 'in_progress':
      return { text: 'In Progress', bg: 'rgba(59, 130, 246, 0.2)', textColor: '#60a5fa' };
    case 'accepted':
      return { text: 'Accepted', bg: 'rgba(245, 191, 25, 0.25)', textColor: colors.primary };
    default:
      return { text: status, bg: 'rgba(255,255,255,0.1)', textColor: 'rgba(255,255,255,0.8)' };
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const [allRides, setAllRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [filterModal, setFilterModal] = useState<'status' | 'date' | null>(null);

  const loadHistory = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setLoading(true);
    try {
      const data = await ridesApi.history(token);
      const list = (data.rides || []) as RideHistoryItem[];
      setAllRides(list);
    } catch (_) {
      setAllRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const rides = useMemo(() => {
    let list = [...allRides];
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      list = list.filter((r) => {
        const rideDate = new Date(r.createdAt);
        switch (dateFilter) {
          case 'today':
            return rideDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return rideDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return rideDate >= monthAgo;
          default:
            return true;
        }
      });
    }
    return list;
  }, [allRides, statusFilter, dateFilter]);

  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All';
  const dateLabel = DATE_OPTIONS.find((o) => o.value === dateFilter)?.label ?? 'All Time';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.filtersCard}>
          <View style={styles.filtersTitleRow}>
            <Ionicons name="filter" size={20} color="#fff" />
            <Text style={styles.filtersTitle}>Filters</Text>
          </View>
          <View style={styles.filtersRow}>
            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Status</Text>
              <TouchableOpacity
                style={styles.filterInput}
                onPress={() => setFilterModal('status')}
              >
                <Text style={styles.filterInputText}>{statusLabel}</Text>
                <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Date</Text>
              <TouchableOpacity
                style={styles.filterInput}
                onPress={() => setFilterModal('date')}
              >
                <Text style={styles.filterInputText}>{dateLabel}</Text>
                <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : rides.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="car" size={56} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No rides found</Text>
            <Text style={styles.emptySub}>Try adjusting your filters</Text>
          </View>
        ) : (
          rides.map((ride) => {
            const badge = getStatusBadge(ride.status);
            const displayPrice = ride.finalPrice ?? ride.price;
            return (
              <View key={ride.id} style={styles.rideCard}>
                <View style={styles.rideCardTop}>
                  <View style={styles.rideAddresses}>
                    <View style={styles.addressRow}>
                      <Ionicons name="location" size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.pickupText} numberOfLines={2}>
                        {ride.pickupAddress || '—'}
                      </Text>
                    </View>
                    <View style={styles.addressRow}>
                      <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.destText} numberOfLines={2}>
                        {ride.destinationAddress || '—'}
                      </Text>
                    </View>
                    <Text style={styles.distanceText}>
                      Distance: {typeof ride.distance === 'number' ? ride.distance.toFixed(1) : ride.distance} km
                      {ride.isRoundTrip ? ' • Round Trip' : ''}
                    </Text>
                    {ride.driver?.fullName && (
                      <Text style={styles.driverText}>Driver: {ride.driver.fullName}</Text>
                    )}
                  </View>
                  <View style={styles.rideRight}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.textColor }]}>{badge.text}</Text>
                    </View>
                    <Text style={styles.priceText}>${displayPrice.toFixed(2)}</Text>
                    {ride.finalPrice != null && ride.finalPrice !== ride.price && (
                      <Text style={styles.priceStrike}>${ride.price.toFixed(2)}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.rideFooter}>
                  <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.dateText}>{formatDate(ride.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Filter modals */}
      <Modal
        visible={filterModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModal(null)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setFilterModal(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
            <FlatList
              data={filterModal === 'status' ? STATUS_OPTIONS : DATE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    if (filterModal === 'status') setStatusFilter(item.value);
                    else setDateFilter(item.value);
                    setFilterModal(null);
                  }}
                >
                  <Text style={styles.optionItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
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
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  filtersCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filtersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  filterBlock: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  filterInputText: {
    color: '#fff',
    fontSize: 15,
  },
  loadingWrap: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.xl * 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 4,
  },
  rideCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  rideCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  rideAddresses: {
    flex: 1,
    marginRight: spacing.md,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  pickupText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  destText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  distanceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  driverText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  rideRight: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  priceStrike: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  rideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: spacing.xl,
  },
  modalClose: {
    padding: spacing.md,
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  modalCloseText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  optionItem: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  optionItemText: {
    color: '#fff',
    fontSize: 16,
  },
});
