import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { getToken } from '@/lib/storage';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/lib/theme';
import { busesApi } from '@/lib/api';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setLoading(true);
    try {
      const data = await busesApi.bookings(token);
      setBookings(data.bookings || []);
    } catch (_) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Bookings</Text>
      {loading ? (
        <Text style={styles.muted}>Loading...</Text>
      ) : bookings.length === 0 ? (
        <Text style={styles.muted}>No bookings yet.</Text>
      ) : (
        (bookings as any[]).map((b: any, i: number) => (
          <View key={b.id || i} style={styles.card}>
            <Text style={styles.cardText}>{b.fromCity ?? '—'} → {b.toCity ?? '—'}</Text>
            <Text style={styles.cardSub}>{b.status ?? ''} · ${b.price ?? '—'}</Text>
          </View>
        ))
      )}
      <Button title="Back" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  muted: { color: colors.textMuted, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm },
  cardText: { color: colors.text },
  cardSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
