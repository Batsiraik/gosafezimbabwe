import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface PushNotificationToken {
  value: string;
  type: 'fcm' | 'apns';
}

/**
 * Initialize push notifications
 * Call this when the app starts (e.g., in dashboard or main layout)
 */
export async function initializePushNotifications(): Promise<PushNotificationToken | null> {
  // Only initialize in native app
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications only work in native app');
    return null;
  }

  try {
    // Request permission to send notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permissions');
      return null;
    }

    // Register with FCM/APNS
    await PushNotifications.register();

    // Get the token (will be available in the 'registration' event)
    return null; // Token comes via event listener
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
}

/**
 * Setup push notification event listeners
 * Call this after initializing
 */
export function setupPushNotificationListeners(
  onTokenReceived: (token: PushNotificationToken) => void,
  onNotificationReceived: (notification: any) => void,
  onNotificationActionPerformed?: (action: any) => void
) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Fired when device is registered for push notifications
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    onTokenReceived({
      value: token.value,
      type: 'fcm', // Android uses FCM, iOS uses APNS
    });
  });

  // Fired when registration fails
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Fired when a notification is received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push notification received: ', notification);
    onNotificationReceived(notification);
  });

  // Fired when user taps on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push notification action performed', action);
    if (onNotificationActionPerformed) {
      onNotificationActionPerformed(action);
    }
  });
}

/**
 * Get the notification sound filename
 * This is the name without extension (Android automatically finds .mp3 in res/raw/)
 */
export function getNotificationSound(): string {
  return 'notification_sound'; // Matches notification_sound.mp3 in res/raw/
}
