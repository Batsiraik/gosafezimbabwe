import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/taxi/rides/start - Start a ride (change status to in_progress)
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
    const { rideId } = body;

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

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    // Get the ride
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    // Verify driver owns this ride
    if (ride.driverId !== driver.id) {
      return NextResponse.json(
        { error: 'Unauthorized to start this ride' },
        { status: 403 }
      );
    }

    // Check if ride is in correct status
    if (ride.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Ride must be accepted before starting' },
        { status: 400 }
      );
    }

    // Update ride status to in_progress
    const updatedRide = await prisma.rideRequest.update({
      where: { id: rideId },
      data: { status: 'in_progress' },
    });

    return NextResponse.json({
      message: 'Ride started successfully',
      ride: updatedRide,
    });
  } catch (error) {
    console.error('Error starting ride:', error);
    return NextResponse.json(
      { error: 'Failed to start ride' },
      { status: 500 }
    );
  }
}
