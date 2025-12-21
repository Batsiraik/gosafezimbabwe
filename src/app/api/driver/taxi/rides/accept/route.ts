import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/taxi/rides/accept - Accept a ride with optional price bid
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { rideId, bidPrice } = body;

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      );
    }

    // Get driver profile
    const driver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });

    if (!driver || !driver.isVerified) {
      return NextResponse.json(
        { error: 'Driver not verified' },
        { status: 403 }
      );
    }

    // Get the ride request
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    if (ride.status !== 'pending' && ride.status !== 'searching') {
      return NextResponse.json(
        { error: 'Ride is no longer available' },
        { status: 400 }
      );
    }

    if (ride.driverId) {
      return NextResponse.json(
        { error: 'Ride has already been accepted' },
        { status: 400 }
      );
    }

    // Update ride with driver and bid price
    const updatedRide = await prisma.rideRequest.update({
      where: { id: rideId },
      data: {
        driverId: driver.id,
        driverBidPrice: bidPrice || ride.price, // Use bid price or original price
        status: 'accepted',
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
    });

    return NextResponse.json({
      message: 'Ride accepted successfully',
      ride: updatedRide,
    });
  } catch (error) {
    console.error('Error accepting ride:', error);
    return NextResponse.json(
      { error: 'Failed to accept ride' },
      { status: 500 }
    );
  }
}
