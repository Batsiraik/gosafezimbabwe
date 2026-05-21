import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isJwtAuthError, verifyUserJwt } from '@/lib/auth-jwt';
import { ensureRideRequestSchema } from '@/lib/ensure-ride-schema-runtime';
import { cancelRidesSearchingTooLong } from '@/lib/ride-auto-cancel';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyUserJwt(token);

    await ensureRideRequestSchema();

    // Auto-cancel rides that have been searching for > 2 min (ride only), so rider sees cancelled and drivers don't see stale rides
    try {
      await cancelRidesSearchingTooLong();
    } catch (autoCancelErr) {
      console.error('[rides/active] auto-cancel failed:', autoCancelErr);
    }

    // Get active ride requests for this user
    // Active statuses: pending, searching, bid_received, accepted, in_progress, completed (if not rated yet)
    const activeRides = await prisma.rideRequest.findMany({
      where: {
        userId: decoded.userId,
        status: {
          in: ['pending', 'searching', 'bid_received', 'accepted', 'in_progress', 'completed'],
        },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1, // Get the most recent active ride
    });

    if (activeRides.length === 0) {
      return NextResponse.json(
        { activeRide: null },
        { status: 200 }
      );
    }

    let activeRide = activeRides[0];

    // If ride is completed, check if user has already rated
    // If they have rated, exclude it from active rides
    if (activeRide.status === 'completed' && activeRide.driverId && activeRide.driver) {
      const driverUserId = activeRide.driver.user.id;
      
      // Check if user has already rated this driver for this ride
      const existingRating = await prisma.rating.findFirst({
        where: {
          rideRequestId: activeRide.id,
          raterId: decoded.userId,
          rateeId: driverUserId,
        },
      });

      // If user has already rated, don't show this as active ride
      if (existingRating) {
        return NextResponse.json(
          { activeRide: null },
          { status: 200 }
        );
      }
    }

    // Prepare driver info if ride is accepted and has a driver
    let driverInfo = null;
    if (activeRide.driverId && activeRide.driver) {
      driverInfo = {
        id: activeRide.driver.id,
        userId: activeRide.driver.user.id, // Add userId for rating
        fullName: activeRide.driver.user.fullName,
        phone: activeRide.driver.user.phone,
        profilePictureUrl: activeRide.driver.user.profilePictureUrl,
        carRegistration: activeRide.driver.carRegistration || '',
      };
    }
    
    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Active ride status:', activeRide.status);
      console.log('Driver ID:', activeRide.driverId);
      console.log('Driver info:', driverInfo);
    }

    return NextResponse.json(
      {
        activeRide: {
          id: activeRide.id,
          pickupAddress: activeRide.pickupAddress,
          destinationAddress: activeRide.destinationAddress,
          distance: activeRide.distance,
          price: activeRide.finalPrice || activeRide.price, // Display: agreed/final or passenger offer
          passengerOffer: activeRide.price,
          recommendedPrice: activeRide.recommendedPrice,
          originalPrice: activeRide.price, // Keep original for reference
          status: activeRide.status,
          isRoundTrip: activeRide.isRoundTrip,
          createdAt: activeRide.createdAt,
          updatedAt: activeRide.updatedAt,
          driver: driverInfo,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Get active ride error:', error);

    if (isJwtAuthError(error)) {
      return NextResponse.json(
        { error: 'Unauthorized or invalid token' },
        { status: 401 }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('rideRequest') || message.includes('Cannot read properties')) {
      console.error('Prisma client may need regeneration. Run: npx prisma generate');
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}
