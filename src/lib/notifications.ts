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

    // Validate token format (FCM tokens can be 50-250 chars, but typically 100-200)
    if (user.pushToken.length < 50 || user.pushToken.length > 250) {
      console.error(`[NOTIFICATION] ❌ Invalid token format for user ${user.fullName}. Token length: ${user.pushToken.length}`);
      console.error(`[NOTIFICATION] Token preview: ${user.pushToken.substring(0, 50)}...`);
      return false;
    }
    
    // Check for common invalid patterns
    if (user.pushToken.includes('YOUR_FCM_TOKEN') || user.pushToken.includes('placeholder')) {
      console.error(`[NOTIFICATION] ❌ Token appears to be a placeholder, not a real token`);
      return false;
    }

    console.log(`[NOTIFICATION] Sending to user ${user.fullName} (${user.phone})`);
    console.log(`[NOTIFICATION] Token: ${user.pushToken.substring(0, 20)}...${user.pushToken.substring(user.pushToken.length - 10)} (${user.pushToken.length} chars)`);
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
    
    // First, check all drivers (without pushToken filter) to see what we have
    const allDrivers = await prisma.driver.findMany({
      where: {
        serviceType: serviceType,
      },
      select: {
        userId: true,
        isVerified: true,
        isOnline: true,
        currentLat: true,
        currentLng: true,
        user: {
          select: {
            fullName: true,
            phone: true,
            pushToken: true,
          },
        },
      },
    });

    console.log(`[NOTIFICATION] Total ${serviceType} drivers in system: ${allDrivers.length}`);
    
    // Log each driver's status
    allDrivers.forEach(driver => {
      console.log(`[NOTIFICATION] Driver: ${driver.user.fullName} - Verified: ${driver.isVerified}, Online: ${driver.isOnline}, Has Token: ${!!driver.user.pushToken}, Has Location: ${!!(driver.currentLat && driver.currentLng)}`);
    });
    
    // Get all online drivers of the specified service type WITH push tokens
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
            pushToken: true,
          },
        },
      },
    });

    console.log(`[NOTIFICATION] Found ${drivers.length} online ${serviceType} drivers with push tokens`);

    if (drivers.length === 0) {
      console.warn(`[NOTIFICATION] ⚠️ No drivers found matching criteria:`);
      console.warn(`[NOTIFICATION]   - serviceType: ${serviceType}`);
      console.warn(`[NOTIFICATION]   - isVerified: true`);
      console.warn(`[NOTIFICATION]   - isOnline: true`);
      console.warn(`[NOTIFICATION]   - has pushToken: true`);
      return [];
    }

    // Calculate distance and filter drivers within radius
    const driversInRange: string[] = [];

    console.log(`[NOTIFICATION] Checking ${drivers.length} drivers for distance...`);

    for (const driver of drivers) {
      if (driver.currentLat && driver.currentLng) {
        const distance = calculateDistance(
          lat,
          lng,
          driver.currentLat,
          driver.currentLng
        );

        console.log(`[NOTIFICATION] Driver ${driver.user.fullName} (${driver.user.phone})`);
        console.log(`[NOTIFICATION]   Location: (${driver.currentLat}, ${driver.currentLng})`);
        console.log(`[NOTIFICATION]   Distance: ${distance.toFixed(2)}km`);

        if (distance <= radiusKm) {
          driversInRange.push(driver.userId);
          console.log(`[NOTIFICATION] ✅ Driver ${driver.user.fullName} (${driver.user.phone}) is within range`);
        } else {
          console.log(`[NOTIFICATION] ⚠️ Driver ${driver.user.fullName} is too far (${distance.toFixed(2)}km > ${radiusKm}km)`);
        }
      } else {
        console.warn(`[NOTIFICATION] Driver ${driver.user.fullName} (${driver.user.phone}) has no location data`);
        console.warn(`[NOTIFICATION]   currentLat: ${driver.currentLat}, currentLng: ${driver.currentLng}`);
      }
    }

    console.log(`[NOTIFICATION] Total drivers in range: ${driversInRange.length}`);
    return driversInRange;
  } catch (error) {
    console.error('[NOTIFICATION] ❌ Error finding drivers within radius:', error);
    console.error('[NOTIFICATION] Error details:', error instanceof Error ? error.stack : error);
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
  try {
    console.log(`[NOTIFICATION] ===== Starting notification for ride request ${rideRequestId} =====`);
    console.log(`[NOTIFICATION] Pickup location: (${pickupLat}, ${pickupLng})`);
    
    const driverIds = await findDriversWithinRadius(pickupLat, pickupLng, 5, 'taxi');
    
    if (driverIds.length === 0) {
      console.warn(`[NOTIFICATION] ⚠️ No drivers found within 5km for ride request ${rideRequestId}`);
      console.warn(`[NOTIFICATION] This could mean:`);
      console.warn(`[NOTIFICATION]   - No drivers are online`);
      console.warn(`[NOTIFICATION]   - No drivers have push tokens`);
      console.warn(`[NOTIFICATION]   - No drivers have location data`);
      console.warn(`[NOTIFICATION]   - All drivers are too far away (>5km)`);
      return;
    }

    console.log(`[NOTIFICATION] Found ${driverIds.length} drivers to notify for ride request ${rideRequestId}`);
    console.log(`[NOTIFICATION] Driver IDs to notify:`, driverIds);

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

    console.log(`[NOTIFICATION] Sending notifications to ${driverIds.length} drivers...`);
    const result = await sendNotificationToUsers(driverIds, payload);
    console.log(`[NOTIFICATION] ===== Notification result for ride ${rideRequestId} =====`);
    console.log(`[NOTIFICATION] Success: ${result.success}, Failed: ${result.failed}`);
    console.log(`[NOTIFICATION] ===== End notification for ride request ${rideRequestId} =====`);
  } catch (error) {
    console.error(`[NOTIFICATION] ❌ CRITICAL ERROR in notifyNewRideRequest:`, error);
    console.error(`[NOTIFICATION] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    throw error; // Re-throw to be caught by caller
  }
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
 * 5. Service Bid Accepted - Notify the home service provider
 */
export async function notifyServiceBidAccepted(
  providerUserId: string,
  serviceRequestId: string,
  customerName: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: '✅ Service Request Accepted!',
    body: `${customerName} accepted your bid. Tap to view details.`,
    data: {
      type: 'service_bid_accepted',
      serviceRequestId: serviceRequestId,
    },
    sound: 'notification_sound',
    priority: 'high',
  };

  await sendNotificationToUser(providerUserId, payload);
}

/**
 * 6. New Home Service Request - Notify providers offering that service
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
 * 7. City-to-City Match - Notify the passenger when driver accepts them
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
 * 8. Send notification to all users (for admin panel - future use)
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
