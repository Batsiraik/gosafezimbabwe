import { prisma } from './prisma';
import { sendPushNotification, PushNotificationPayload } from './send-push-notification';

/**
 * Send notification to a user by their user ID
 */
async function sendNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    console.log(`[NOTIFICATION] Attempting to send notification to user: ${userId}`);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true, fullName: true, phone: true },
    });

    if (!user) {
      console.error(`[NOTIFICATION] User ${userId} not found in database`);
      return false;
    }

    if (!user.pushToken) {
      console.warn(`[NOTIFICATION] User ${user.fullName} (${user.phone}) has no push token stored`);
      return false;
    }

    console.log(`[NOTIFICATION] Sending to user ${user.fullName} (${user.phone}), token: ${user.pushToken.substring(0, 20)}...`);
    const result = await sendPushNotification(user.pushToken, payload);
    
    if (result) {
      console.log(`[NOTIFICATION] ✅ Successfully sent notification to ${user.fullName}`);
    } else {
      console.error(`[NOTIFICATION] ❌ Failed to send notification to ${user.fullName}`);
    }
    
    return result;
  } catch (error) {
    console.error(`[NOTIFICATION] Error sending notification to user ${userId}:`, error);
    return false;
  }
}

/**
 * Send notification to multiple users
 */
async function sendNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    userIds.map(userId => sendNotificationToUser(userId, payload))
  );

  const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed = results.length - success;

  return { success, failed };
}

/**
 * Find drivers within 5km of a location
 */
async function findDriversWithinRadius(
  lat: number,
  lng: number,
  radiusKm: number = 5,
  serviceType: 'taxi' | 'parcel' = 'taxi'
): Promise<string[]> {
  try {
    console.log(`[NOTIFICATION] Finding ${serviceType} drivers within ${radiusKm}km of (${lat}, ${lng})`);
    
    // Get all online drivers of the specified service type
    const drivers = await prisma.driver.findMany({
      where: {
        serviceType: serviceType,
        isVerified: true,
        isOnline: true,
        user: {
          pushToken: { not: null },
        },
      },
      select: {
        userId: true,
        currentLat: true,
        currentLng: true,
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    });

    console.log(`[NOTIFICATION] Found ${drivers.length} online ${serviceType} drivers with push tokens`);

    // Calculate distance and filter drivers within radius
    const driversInRange: string[] = [];

    for (const driver of drivers) {
      if (driver.currentLat && driver.currentLng) {
        const distance = calculateDistance(
          lat,
          lng,
          driver.currentLat,
          driver.currentLng
        );

        console.log(`[NOTIFICATION] Driver ${driver.user.fullName} is ${distance.toFixed(2)}km away`);

        if (distance <= radiusKm) {
          driversInRange.push(driver.userId);
          console.log(`[NOTIFICATION] ✅ Driver ${driver.user.fullName} (${driver.user.phone}) is within range`);
        } else {
          console.log(`[NOTIFICATION] ⚠️ Driver ${driver.user.fullName} is too far (${distance.toFixed(2)}km > ${radiusKm}km)`);
        }
      } else {
        console.warn(`[NOTIFICATION] Driver ${driver.user.fullName} has no location data`);
      }
    }

    console.log(`[NOTIFICATION] Total drivers in range: ${driversInRange.length}`);
    return driversInRange;
  } catch (error) {
    console.error('[NOTIFICATION] Error finding drivers within radius:', error);
    return [];
  }
}

/**
 * Calculate distance between two coordinates in kilometers (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * 1. New Ride Request - Notify drivers within 5km
 */
export async function notifyNewRideRequest(
  rideRequestId: string,
  pickupLat: number,
  pickupLng: number
): Promise<void> {
  console.log(`[NOTIFICATION] ===== Starting notification for ride request ${rideRequestId} =====`);
  console.log(`[NOTIFICATION] Pickup location: (${pickupLat}, ${pickupLng})`);
  
  const driverIds = await findDriversWithinRadius(pickupLat, pickupLng, 5, 'taxi');
  
  if (driverIds.length === 0) {
    console.warn(`[NOTIFICATION] ⚠️ No drivers found within 5km for ride request ${rideRequestId}`);
    return;
  }

  console.log(`[NOTIFICATION] Found ${driverIds.length} drivers to notify for ride request ${rideRequestId}`);

  const payload: PushNotificationPayload = {
    title: '🚗 New Ride Request',
    body: 'A new ride request is available near you!',
    data: {
      type: 'new_ride_request',
      rideRequestId: rideRequestId,
    },
    sound: 'notification_sound',
    priority: 'high',
  };

  const result = await sendNotificationToUsers(driverIds, payload);
  console.log(`[NOTIFICATION] ===== Notification result for ride ${rideRequestId} =====`);
  console.log(`[NOTIFICATION] Success: ${result.success}, Failed: ${result.failed}`);
  console.log(`[NOTIFICATION] ===== End notification for ride request ${rideRequestId} =====`);
}

/**
 * 2. Ride Bid Accepted - Notify the driver
 */
export async function notifyRideBidAccepted(
  driverUserId: string,
  rideRequestId: string,
  passengerName: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '✅ Ride Accepted!',
    body: `${passengerName} accepted your bid. Tap to view details.`,
    data: {
      type: 'ride_bid_accepted',
      rideRequestId: rideRequestId,
    },
    sound: 'notification_sound',
    priority: 'high',
  };

  await sendNotificationToUser(driverUserId, payload);
}

/**
 * 3. New Parcel Request - Notify parcel drivers within 5km
 */
export async function notifyNewParcelRequest(
  parcelRequestId: string,
  pickupLat: number,
  pickupLng: number
): Promise<void> {
  const driverIds = await findDriversWithinRadius(pickupLat, pickupLng, 5, 'parcel');
  
  if (driverIds.length === 0) {
    console.log('No parcel drivers found within 5km for parcel request');
    return;
  }

  const payload: PushNotificationPayload = {
    title: '📦 New Parcel Delivery',
    body: 'A new parcel delivery request is available near you!',
    data: {
      type: 'new_parcel_request',
      parcelRequestId: parcelRequestId,
    },
    sound: 'notification_sound',
    priority: 'high',
  };

  await sendNotificationToUsers(driverIds, payload);
  console.log(`Sent new parcel request notification to ${driverIds.length} drivers`);
}

/**
 * 4. Parcel Bid Accepted - Notify the driver
 */
export async function notifyParcelBidAccepted(
  driverUserId: string,
  parcelRequestId: string,
  customerName: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '✅ Delivery Accepted!',
    body: `${customerName} accepted your bid. Tap to view details.`,
    data: {
      type: 'parcel_bid_accepted',
      parcelRequestId: parcelRequestId,
    },
    sound: 'notification_sound',
    priority: 'high',
  };

  await sendNotificationToUser(driverUserId, payload);
}

/**
 * 5. New Home Service Request - Notify providers offering that service
 */
export async function notifyNewServiceRequest(
  serviceRequestId: string,
  serviceId: string
): Promise<void> {
  try {
    // Find all verified service providers offering this service
    const providers = await prisma.serviceProvider.findMany({
      where: {
        isVerified: true,
        services: {
          some: {
            serviceId: serviceId,
          },
        },
        user: {
          pushToken: { not: null },
        },
      },
      select: {
        userId: true,
      },
    });

    if (providers.length === 0) {
      console.log(`No service providers found for service ${serviceId}`);
      return;
    }

    // Get service name
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { name: true },
    });

    const payload: PushNotificationPayload = {
      title: '🔧 New Service Request',
      body: `A new ${service?.name || 'service'} request is available!`,
      data: {
        type: 'new_service_request',
        serviceRequestId: serviceRequestId,
        serviceId: serviceId,
      },
      sound: 'notification_sound',
      priority: 'high',
    };

    const userIds = providers.map(p => p.userId);
    await sendNotificationToUsers(userIds, payload);
    console.log(`Sent new service request notification to ${providers.length} providers`);
  } catch (error) {
    console.error('Error notifying service providers:', error);
  }
}

/**
 * 6. City-to-City Match - Notify the passenger when driver accepts them
 */
export async function notifyCityToCityMatch(
  passengerUserId: string,
  driverName: string,
  fromCity: string,
  toCity: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '🎉 Ride Share Match!',
    body: `${driverName} wants to share a ride from ${fromCity} to ${toCity}. Tap to view details.`,
    data: {
      type: 'city_to_city_match',
    },
    sound: 'notification_sound',
    priority: 'high',
  };

  await sendNotificationToUser(passengerUserId, payload);
}

/**
 * 7. Send notification to all users (for admin panel - future use)
 */
export async function notifyAllUsers(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: number; failed: number }> {
  try {
    const users = await prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        id: true,
      },
    });

    const payload: PushNotificationPayload = {
      title,
      body,
      data,
      sound: 'notification_sound',
      priority: 'high',
    };

    const userIds = users.map(u => u.id);
    return await sendNotificationToUsers(userIds, payload);
  } catch (error) {
    console.error('Error notifying all users:', error);
    return { success: 0, failed: 0 };
  }
}
