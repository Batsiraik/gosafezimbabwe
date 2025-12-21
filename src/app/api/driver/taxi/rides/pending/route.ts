import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/taxi/rides/pending - Get pending rides within 5km
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get driver profile
    const driver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    if (!driver.isVerified) {
      return NextResponse.json(
        { error: 'Driver not verified. Please wait for admin approval.' },
        { status: 403 }
      );
    }

    if (!driver.isOnline) {
      return NextResponse.json({
        rides: [],
        count: 0,
        message: 'Driver is offline. Turn on to receive ride requests.',
      });
    }

    if (!driver.currentLat || !driver.currentLng) {
      return NextResponse.json(
        { error: 'Driver location not set. Please update your location.' },
        { status: 400 }
      );
    }

    // Get pending/searching rides
    const pendingRides = await prisma.rideRequest.findMany({
      where: {
        status: {
          in: ['pending', 'searching'],
        },
        driverId: null, // Not yet accepted
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate distance and filter rides within 5km
    const ridesWithin5km = pendingRides
      .map((ride) => {
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = ((ride.pickupLat - driver.currentLat!) * Math.PI) / 180;
        const dLon = ((ride.pickupLng - driver.currentLng!) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((driver.currentLat! * Math.PI) / 180) *
            Math.cos((ride.pickupLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return {
          ...ride,
          distanceFromDriver: distance,
        };
      })
      .filter((ride) => ride.distanceFromDriver <= 5)
      .sort((a, b) => a.distanceFromDriver - b.distanceFromDriver);

    return NextResponse.json({
      rides: ridesWithin5km,
      count: ridesWithin5km.length,
    });
  } catch (error) {
    console.error('Error fetching pending rides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending rides' },
      { status: 500 }
    );
  }
}
