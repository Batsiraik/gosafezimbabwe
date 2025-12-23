import { getFirebaseAdmin, initializeFirebaseAdmin } from './firebase-admin';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string; // e.g., 'notification_sound' for Android
  badge?: number; // iOS only
  priority?: 'high' | 'normal';
}

/**
 * Send push notification to a single device using FCM
 * @param pushToken - The FCM/APNS token from the user's device
 * @param payload - Notification payload
 */
export async function sendPushNotification(
  pushToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Ensure Firebase is initialized
    initializeFirebaseAdmin();
    const admin = getFirebaseAdmin();
    
    if (!admin) {
      console.error('Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT environment variable.');
      return false;
    }
    
    const messaging = admin.messaging();

    const message: admin.messaging.Message = {
      token: pushToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...payload.data,
        // Convert all data values to strings (FCM requirement)
        ...Object.fromEntries(
          Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
        ),
      },
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: payload.sound || 'notification_sound',
          channelId: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: payload.sound || 'default',
            badge: payload.badge,
          },
        },
      },
    };

    const response = await messaging.send(message);
    console.log('Successfully sent push notification:', response);
    return true;
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    
    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('Invalid or unregistered token, should remove from database');
      // TODO: Remove invalid token from database
    }
    
    return false;
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendPushNotifications(
  pushTokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    pushTokens.map(token => sendPushNotification(token, payload))
  );

  const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - success;

  return { success, failed };
}
