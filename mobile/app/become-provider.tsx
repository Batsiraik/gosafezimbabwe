import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { safeBack } from '@/lib/safe-back';
import { IconArrowBack, IconCar, IconPackage, IconWrench, IconBus } from '@/components/DashboardIcons';
import { getToken } from '@/lib/storage';
import { setUserMode } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import { driverApi } from '@/lib/api';

const SERVICE_ICONS = {
  taxi: IconCar,
  parcel: IconPackage,
  'home-services': IconWrench,
  bus: IconBus,
} as const;

const SERVICES = [
  {
    id: 'taxi' as const,
    name: 'Driver',
    description: 'Provide ride services to passengers',
    route: '/driver/taxi/register',
    dashboard: '/driver/taxi/dashboard',
  },
  {
    id: 'parcel' as const,
    name: 'Parcel Delivery (Motorbike)',
    description: 'Deliver parcels using your motorbike',
    route: '/driver/parcel/register',
    dashboard: '/driver/parcel/dashboard',
  },
  {
    id: 'home-services' as const,
    name: 'Business & Home Service Provider',
    description: 'Offer business & home services (plumber, electrician, etc.)',
    route: '/driver/home-services/register',
    dashboard: '/driver/home-services/dashboard',
  },
  {
    id: 'bus' as const,
    name: 'Bus Service Provider',
    description: 'Operate bus routes and schedules',
    route: '/driver/bus/register',
    dashboard: '/driver/bus/dashboard',
  },
];

export default function BecomeProviderScreen() {
  const [checking, setChecking] = useState<string | null>(null);

  const handleServiceSelect = useCallback(async (service: typeof SERVICES[0]) => {
    const token = await getToken();
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    setChecking(service.id);
    try {
      // Only persist driver mode once they have a profile or after register success — not when merely opening signup
      if (service.id === 'taxi') {
        const data = await driverApi.taxiStatus(token);
        if ((data as { driver?: unknown }).driver) {
          await setUserMode('taxi');
          router.replace(service.dashboard);
        } else {
          router.replace(service.route);
        }
      } else if (service.id === 'parcel') {
        const data = await driverApi.parcelStatus(token);
        if ((data as { driver?: unknown }).driver) {
          await setUserMode('parcel');
          router.replace(service.dashboard);
        } else {
          router.replace(service.route);
        }
      } else if (service.id === 'home-services') {
        const data = await driverApi.homeServicesStatus(token);
        if ((data as { provider?: unknown }).provider) {
          await setUserMode('home-services');
          router.replace(service.dashboard);
        } else {
          router.replace(service.route);
        }
      } else {
        const data = await driverApi.busStatus(token);
        if ((data as { provider?: unknown }).provider) {
          await setUserMode('bus');
          router.replace(service.dashboard);
        } else {
          router.replace(service.route);
        }
      }
    } catch (_) {
      // Network/API error: open register without persisting mode (avoids trapping user in driver flow on next launch)
      router.replace(service.route);
    } finally {
      setChecking(null);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack('/dashboard')}>
          <IconArrowBack color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Service Provider</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro card */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>What services do you offer?</Text>
          <Text style={styles.introBody}>
            Select the type of service you want to provide. You'll need to complete verification before you can start accepting requests.
          </Text>
        </View>

        {/* Service cards */}
        {SERVICES.map((service) => {
          const isChecking = checking === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, isChecking && styles.serviceCardDisabled]}
              onPress={() => handleServiceSelect(service)}
              disabled={!!checking}
              activeOpacity={0.8}
            >
              <View style={styles.serviceIconWrap}>
                {(() => {
                  const IconComponent = SERVICE_ICONS[service.id];
                  const iconColor = isChecking ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)';
                  return <IconComponent color={iconColor} size={32} />;
                })()}
              </View>
              <View style={styles.serviceText}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
                {isChecking && (
                  <View style={styles.checkingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.checkingText}>Checking status...</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  introCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.sm,
  },
  introBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  serviceCardDisabled: {
    opacity: 0.8,
  },
  serviceIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceText: { flex: 1 },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  checkingText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
});
