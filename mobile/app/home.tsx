import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, Redirect } from 'expo-router';
import { getToken, getUser } from '@/lib/storage';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { colors, spacing } from '@/lib/theme';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const user = await getUser();
      setAuthenticated(!!(token && user));
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (authenticated) return <Redirect href="/dashboard" />;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>GO SAFE</Text>
        </View>
        <Text style={styles.tagline}>Your go to App for Everything</Text>
        <View style={styles.buttons}>
          <Button title="Create Account" onPress={() => router.push('/(auth)/register')} />
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  tagline: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttons: {
    gap: spacing.md,
  },
  signInBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  signInText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
