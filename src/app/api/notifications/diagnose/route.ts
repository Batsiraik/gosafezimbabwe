import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { initializeFirebaseAdmin, getFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * Diagnostic endpoint to check notification setup
 * GET /api/notifications/diagnose
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      userId: decoded.userId,
      checks: {},
    };

    // Check 1: User has push token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        pushToken: true,
      },
    });

    diagnostics.checks.user = {
      exists: !!user,
      hasPushToken: !!user?.pushToken,
      pushTokenPreview: user?.pushToken ? user.pushToken.substring(0, 30) + '...' : null,
    };

    // Check 2: Driver profile status
    const driver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
      select: {
        id: true,
        serviceType: true,
        isVerified: true,
        isOnline: true,
        currentLat: true,
        currentLng: true,
      },
    });

    diagnostics.checks.driver = {
      exists: !!driver,
      serviceType: driver?.serviceType || null,
      isVerified: driver?.isVerified || false,
      isOnline: driver?.isOnline || false,
      hasLocation: !!(driver?.currentLat && driver?.currentLng),
      location: driver?.currentLat && driver?.currentLng 
        ? { lat: driver.currentLat, lng: driver.currentLng }
        : null,
    };

    // Check 3: Firebase Admin initialization
    try {
      initializeFirebaseAdmin();
      const admin = getFirebaseAdmin();
      diagnostics.checks.firebase = {
        initialized: !!admin,
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
      };
    } catch (error: any) {
      diagnostics.checks.firebase = {
        initialized: false,
        error: error.message,
      };
    }

    // Check 4: Recent ride requests (to test notification)
    const recentRides = await prisma.rideRequest.findMany({
      where: {
        status: 'searching',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
      select: {
        id: true,
        pickupLat: true,
        pickupLng: true,
        createdAt: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    diagnostics.checks.recentRides = {
      count: recentRides.length,
      rides: recentRides,
    };

    // Check 5: Nearby drivers (if user is a driver)
    if (driver && driver.currentLat && driver.currentLng) {
      const nearbyDrivers = await prisma.driver.findMany({
        where: {
          serviceType: driver.serviceType,
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

      diagnostics.checks.nearbyDrivers = {
        count: nearbyDrivers.length,
        drivers: nearbyDrivers.map(d => ({
          name: d.user.fullName,
          phone: d.user.phone,
          hasLocation: !!(d.currentLat && d.currentLng),
        })),
      };
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        canReceiveNotifications: !!(user?.pushToken),
        canSendNotifications: diagnostics.checks.firebase.initialized,
        isDriver: !!driver,
        driverOnline: driver?.isOnline || false,
        driverVerified: driver?.isVerified || false,
      },
    });
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run diagnostics' },
      { status: 500 }
    );
  }
}
