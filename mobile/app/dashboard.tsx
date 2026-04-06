import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getToken, getUser, clearAuth } from '@/lib/storage';
import { colors, spacing } from '@/lib/theme';
import {
  settingsApi,
  cityToCityApi,
  servicesApi,
} from '@/lib/api';
import { getPushToken } from '@/lib/push-notifications';
import { prefetchLocation } from '@/lib/location';
import {
  IconBell,
  IconClock,
  IconSettings,
  IconLogOut,
  WheelIcon,
  IconBriefcase,
  IconWhatsApp,
} from '@/components/DashboardIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Match Next.js dashboard exactly: 400px wheel, left -133px for semicircle, icon radius 160px
const WHEEL_SIZE = 400;
const WHEEL_RADIUS = 200;
const ICON_RADIUS = 160;
const CENTER_LOGO_SIZE = 100;
const WHEEL_LEFT_OFFSET = -133;
const SHOW_WHATSAPP_FAB = false; // set true to show WhatsApp support button

type User = { fullName?: string };
type City = { id: string; name: string };

function placeOnCircle(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const iconW = 60;
  const iconH = 50;
  return {
    left: WHEEL_RADIUS + ICON_RADIUS * Math.cos(rad) - iconW / 2,
    top: WHEEL_RADIUS + ICON_RADIUS * Math.sin(rad) - iconH / 2,
  };
}

// Same order as design: RIDE, DELIVERY, CITY TO CITY, HOME SERVICES, BUS RANK
const serviceItems = [
  { key: 'ride', label: 'RIDE', iconName: 'car' as const, href: '/ride' },
  { key: 'delivery', label: 'DELIVERY', iconName: 'bicycle' as const, href: '/parcel' },
  { key: 'city', label: 'CITY TO CITY', iconName: 'location' as const, href: '/city-to-city' },
  { key: 'home', label: 'BUSINESS & HOME SERVICES', iconName: 'construct' as const, href: '/home-services' },
  { key: 'bus', label: 'BUS RANK', iconName: 'bus' as const, href: '/bus-booking' },
];
// Next.js angles: ride 270°, delivery 315°, city 0°, home 45°, bus 90°
const angles = [270, 315, 0, 45, 90];

// Manual position tweaks (left/right = negative/positive, up/down = negative/positive)
const iconPositionOffset: Record<string, { left?: number; top?: number }> = {
  ride: { left: -15 },   // move car icon left (increase negative to move more left)
  delivery: {},
  city: {},
  home: {},
  bus: {},
};

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCityToCity, setActiveCityToCity] = useState<Record<string, unknown> | null>(null);
  const [activeService, setActiveService] = useState<Record<string, unknown> | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('263776954448');
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    const userData = await getUser();
    if (!token || !userData) {
      router.replace('/(auth)/login');
      return;
    }
    setUser(userData as User);
    try {
      const [citiesRes, c2cRes, svcRes, whatsappRes] = await Promise.all([
        settingsApi.cities(token).catch(() => ({ cities: [] })),
        cityToCityApi.active(token).catch(() => ({ activeRequest: null })),
        servicesApi.active(token).catch(() => ({ request: null })),
        settingsApi.whatsapp(token).catch(() => ({ number: undefined })),
      ]);
      setCities(citiesRes.cities || []);
      setActiveCityToCity((c2cRes as { activeRequest?: Record<string, unknown> }).activeRequest || null);
      setActiveService((svcRes as { request?: Record<string, unknown> }).request || null);
      if (whatsappRes?.number) setWhatsappNumber(whatsappRes.number);
      setOffline(false);
    } catch (_) {
      setOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    prefetchLocation();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authToken = await getToken();
      if (!authToken) return;
      const push = await getPushToken();
      if (cancelled || !push?.token) return;
      try {
        await settingsApi.pushToken(authToken, push.token);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleLogout = async () => {
    await clearAuth();
    router.replace('/');
  };

  const openWhatsApp = () => {
    const url = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=Hi%2C%20I%20need%20support%20with...`;
    Linking.openURL(url).catch(() => {});
  };

  const firstName = user?.fullName?.split(' ')[0] || user?.fullName || 'there';
  const fromCityName = activeCityToCity?.fromCityId
    ? cities.find((c) => c.id === activeCityToCity.fromCityId)?.name ?? (activeCityToCity as any).fromCity?.name ?? 'N/A'
    : 'N/A';
  const toCityName = activeCityToCity?.toCityId
    ? cities.find((c) => c.id === activeCityToCity.toCityId)?.name ?? (activeCityToCity as any).toCity?.name ?? 'N/A'
    : 'N/A';

  if (loading && !user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No connection. Pull to refresh.</Text>
        </View>
      )}

      {/* Header: circular yellow logo + GO SAFE, then bell, history, settings, logout */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoCircle}>
            <Image source={require('@/assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>GO SAFE</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => {}}>
            <IconBell color="#ffffff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/history')}>
            <IconClock color="#ffffff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/settings')}>
            <IconSettings color="#ffffff" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconBtn, styles.logoutBtn]} onPress={handleLogout}>
            <IconLogOut color="#ffffff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting – screenshot: "Hi john!" white, emojis yellow */}
        <View style={styles.greetingWrap}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingEmoji}>👋 </Text>
            <Text style={styles.greetingText}>Hi {firstName}! </Text>
            <Text style={styles.greetingEmoji}>😊 ✨</Text>
          </Text>
        </View>

        {/* Active City-to-City */}
        {activeCityToCity && (
          <TouchableOpacity style={styles.activeCard} onPress={() => router.push('/city-to-city')}>
            <Text style={styles.activeCardTitle}>Active Ride Share Search</Text>
            <Text style={styles.activeCardSub}>{fromCityName} → {toCityName}</Text>
            <Text style={styles.activeCardHint}>Tap to view</Text>
          </TouchableOpacity>
        )}

        {/* Active Home Service */}
        {activeService && (
          <TouchableOpacity style={styles.activeCard} onPress={() => router.push('/home-services')}>
            <Text style={styles.activeCardTitle}>Active Service Request</Text>
            <Text style={styles.activeCardSub}>{(activeService as any).service?.name || 'Service'}</Text>
            <Text style={styles.activeCardHint}>Tap to view</Text>
          </TouchableOpacity>
        )}

        {/* Semicircle menu – same as Next.js: 400px wheel, left -133px, yellow icons #ffe200 */}
        <View style={[styles.wheelContainer, { height: WHEEL_SIZE }]}>
          <View style={[styles.wheel, { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_RADIUS, marginLeft: WHEEL_LEFT_OFFSET }]}>
            <View style={[styles.centerLogoWrap, { width: CENTER_LOGO_SIZE, height: CENTER_LOGO_SIZE, borderRadius: CENTER_LOGO_SIZE / 2, marginLeft: -CENTER_LOGO_SIZE / 2, marginTop: -CENTER_LOGO_SIZE / 2, left: WHEEL_RADIUS, top: WHEEL_RADIUS }]}>
              <Image source={require('@/assets/icon.png')} style={styles.centerLogoImg} resizeMode="contain" />
            </View>
            {serviceItems.map((item, i) => {
              const pos = placeOnCircle(angles[i]);
              const offset = iconPositionOffset[item.key] || {};
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.wheelIcon, pos, { left: pos.left + (offset.left ?? 0), top: pos.top + (offset.top ?? 0) }]}
                  onPress={() => router.push(item.href as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.wheelIconInner}>
                    <WheelIcon name={item.iconName} color="#ffe200" size={32} />
                    <Text style={styles.wheelLabel}>{item.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Become a Service Provider – soft yellow/gold bg, white icon + white text (screenshot) */}
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/become-provider')} activeOpacity={0.9}>
          <IconBriefcase color="#ffffff" size={22} />
          <Text style={styles.ctaButtonText}>Become a Service Provider</Text>
        </TouchableOpacity>
        <Text style={styles.ctaSubtext}>
          Join as a <Text style={styles.ctaHighlight}>Driver</Text>, bike delivery guy, motor mechanic, <Text style={styles.ctaHighlight}>electrician</Text>, <Text style={styles.ctaHighlight}>security guard</Text>, <Text style={styles.ctaHighlight}>plumber</Text>, and more
        </Text>
      </ScrollView>

      {/* WhatsApp support FAB */}
      {SHOW_WHATSAPP_FAB && (
        <TouchableOpacity style={styles.whatsappFab} onPress={openWhatsApp} activeOpacity={0.9}>
          <IconWhatsApp color="#ffffff" size={32} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dashboardBg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
  },
  offlineBanner: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  offlineText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    backgroundColor: '#434345',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.4)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  greetingWrap: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: 20,
    textAlign: 'center',
  },
  greetingText: {
    color: '#ffffff',
  },
  greetingEmoji: {
    color: '#ffe200',
  },
  activeCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  activeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  activeCardSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  activeCardHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  wheelContainer: {
    width: '100%',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  wheel: {
    position: 'relative',
    backgroundColor: '#434343',
    overflow: 'visible',
  },
  centerLogoWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffe200',
    overflow: 'hidden',
  },
  centerLogoImg: {
    width: CENTER_LOGO_SIZE * 0.85,
    height: CENTER_LOGO_SIZE * 0.85,
  },
  wheelIcon: {
    position: 'absolute',
    width: 60,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    alignSelf: 'center',
    marginTop: spacing.xl * 1.2,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f5bf19',
    borderWidth: 1,
    borderColor: 'rgba(245, 191, 25, 0.5)',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  ctaSubtext: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  ctaHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  whatsappFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
