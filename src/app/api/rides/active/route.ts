import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

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
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as { userId: string; phone: string };

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
          price: activeRide.finalPrice || activeRide.price, // Use finalPrice (bid price) if available
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
  } catch (error: any) {
    console.error('Get active ride error:', error);
    
    // More detailed error logging
    if (error.message?.includes('rideRequest') || error.message?.includes('Cannot read properties')) {
      console.error('Prisma client may need regeneration. Run: npx prisma generate');
      console.error('Then restart your dev server.');
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
