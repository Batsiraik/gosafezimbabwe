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
    console.log(`[FCM] Attempting to send notification to token: ${pushToken.substring(0, 20)}...`);
    console.log(`[FCM] Notification payload:`, { title: payload.title, body: payload.body });
    
    // Ensure Firebase is initialized
    initializeFirebaseAdmin();
    const admin = getFirebaseAdmin();
    
    if (!admin) {
      console.error('[FCM] ❌ Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT environment variable.');
      return false;
    }
    
    console.log('[FCM] ✅ Firebase Admin initialized successfully');
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

    console.log('[FCM] Sending message to FCM...');
    const response = await messaging.send(message);
    console.log('[FCM] ✅ Successfully sent push notification. Message ID:', response);
    return true;
  } catch (error: any) {
    console.error('[FCM] ❌ Error sending push notification:', error);
    console.error('[FCM] Error code:', error.code);
    console.error('[FCM] Error message:', error.message);
    
    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('[FCM] ⚠️ Invalid or unregistered token, should remove from database');
      console.warn('[FCM] Token:', pushToken.substring(0, 30) + '...');
      // TODO: Remove invalid token from database
    } else if (error.code === 'messaging/authentication-error') {
      console.error('[FCM] ❌ Firebase authentication error - check FIREBASE_SERVICE_ACCOUNT');
    } else if (error.code === 'messaging/server-unavailable') {
      console.error('[FCM] ❌ FCM server unavailable - temporary error');
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
