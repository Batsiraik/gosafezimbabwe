/**
 * Push notifications – Expo (FCM on Android, APNs on iOS).
 * Backend already uses Firebase Admin to send; we register the device token
 * with POST /api/users/push-token so the same Firebase project can send to this app.
 * All provider notifications (taxi, parcel, home-services, bus, city-to-city) use the same token.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Show notifications when app is in foreground (alert + sound + badge)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Create Android default notification channel so FCM messages with channelId "default"
 * play sound. Call once on app init.
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'GO SAFE',
      importance: Notifications.AndroidImportance.HIGH,
      // Same as web/backend: notification_sound (file in res/raw from app.json plugin sounds)
      sound: 'notification_sound',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  } catch (_) {}
}

export type PushTokenResult = { token: string; type: 'fcm' | 'apns' };

/**
 * Request permission and get the native device push token (FCM on Android when configured).
 * Send this token to POST /api/users/push-token – backend uses it with Firebase Admin.
 */
export async function getPushToken(): Promise<PushTokenResult | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    return null;
  }

  try {
    // getDevicePushTokenAsync returns native FCM token on Android when FCM is configured (google-services.json)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const token = typeof tokenData.data === 'string' ? tokenData.data : (tokenData as any).data;
    if (!token || token.length < 50) return null;
    return {
      token,
      type: Platform.OS === 'ios' ? 'apns' : 'fcm',
    };
  } catch (_) {
    return null;
  }
}

/**
 * Add listener for when a notification is received (foreground).
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user taps a notification.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
