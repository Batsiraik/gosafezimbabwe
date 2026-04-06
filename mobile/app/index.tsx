import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { getToken, getUser, getUserMode, getDashboardRoute, setUser } from '@/lib/storage';
import { colors } from '@/lib/theme';
import { settingsApi } from '@/lib/api';
import { prefetchLocation } from '@/lib/location';

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      // Token is the source of truth: persist across app updates so users stay logged in
      if (!token) {
        setRoute('/(auth)/login');
        return;
      }
      // Restore user in storage if missing (e.g. after app update or corruption)
      const user = await getUser();
      if (!user) {
        try {
          const data = await settingsApi.userMe(token);
          if (data?.user) await setUser(data.user as Record<string, unknown>);
        } catch (_) {}
      }
      const mode = await getUserMode();
      setRoute(getDashboardRoute(mode));
      // Prefetch location so ride/parcel open with position in ~1s
      prefetchLocation();
    })();
  }, []);

  if (route === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}
