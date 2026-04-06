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
import { IconArrowBack, IconWrench, IconLocation } from '@/components/DashboardIcons';
import { safeBack } from '@/lib/safe-back';
import { getToken } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverHomeServicesApi } from '@/lib/api';

type RequestItem = {
  id: string;
  jobDescription?: string;
  budget?: number;
  finalPrice?: number | null;
  location?: string;
  status: string;
  service?: { name?: string };
  user?: { fullName?: string; phone?: string };
};

export default function DriverHomeServicesHistoryScreen() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    try {
      const data = await driverHomeServicesApi.acceptedRequests(token);
      setRequests((data.requests as RequestItem[]) || []);
    } catch (_) {
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/driver/home-services/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service History</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {requests.length === 0 ? (
            <View style={styles.empty}>
              <IconWrench color="rgba(255,255,255,0.3)" size={48} />
              <Text style={styles.emptyText}>No service history yet</Text>
            </View>
          ) : (
            requests.map((r) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.serviceName}>{r.service?.name}: {r.jobDescription}</Text>
                <Text style={styles.meta}>${(r.finalPrice ?? r.budget ?? 0).toFixed(2)} · {r.status}</Text>
                {r.location ? <Text style={styles.meta}>{r.location}</Text> : null}
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
  emptyText: { color: 'rgba(255,255,255,0.6)', marginTop: spacing.sm },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  serviceName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  meta: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
});
