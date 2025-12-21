import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/rides/rate/check?rideId=xxx - Check if user has already rated this ride
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

    const { searchParams } = new URL(request.url);
    const rideId = searchParams.get('rideId');

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      );
    }

    // Get the ride to find the other party
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
      include: {
        user: true,
        driver: {
          include: {
            user: true,
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

    // Determine who the user is rating (the other party)
    const isPassenger = ride.userId === decoded.userId;
    const rateeId = isPassenger 
      ? ride.driver?.user.id 
      : ride.userId;

    if (!rateeId) {
      return NextResponse.json({ hasRated: false });
    }

    // Check if rating exists
    const existingRating = await prisma.rating.findUnique({
      where: {
        rideRequestId_raterId_rateeId: {
          rideRequestId: rideId,
          raterId: decoded.userId,
          rateeId: rateeId,
        },
      },
    });

    return NextResponse.json({
      hasRated: !!existingRating,
    });
  } catch (error) {
    console.error('Error checking rating:', error);
    return NextResponse.json(
      { error: 'Failed to check rating' },
      { status: 500 }
    );
  }
}
