import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { notifyNewRideRequest } from '@/lib/notifications';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      pickupLat,
      pickupLng,
      pickupAddress,
      destinationLat,
      destinationLng,
      destinationAddress,
      distance,
      price,
      isRoundTrip,
    } = body;

    // Validate required fields
    if (
      !pickupLat || !pickupLng || !pickupAddress ||
      !destinationLat || !destinationLng || !destinationAddress ||
      distance === undefined || price === undefined
    ) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Create ride request
    const rideRequest = await prisma.rideRequest.create({
      data: {
        userId: decoded.userId,
        pickupLat,
        pickupLng,
        pickupAddress,
        destinationLat,
        destinationLng,
        destinationAddress,
        distance,
        price,
        isRoundTrip: isRoundTrip || false,
        status: 'searching', // Start with searching status
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

    // Notify nearby drivers (async, don't wait)
    console.log(`[RIDE CREATE] Ride request ${rideRequest.id} created, triggering notifications...`);
    notifyNewRideRequest(rideRequest.id, pickupLat, pickupLng).catch((error) => {
      console.error('[RIDE CREATE] Error sending ride request notifications:', error);
      console.error('[RIDE CREATE] Error stack:', error.stack);
    });

    return NextResponse.json(
      {
        message: 'Ride request created successfully',
        rideRequest: {
          id: rideRequest.id,
          pickupAddress: rideRequest.pickupAddress,
          destinationAddress: rideRequest.destinationAddress,
          distance: rideRequest.distance,
          price: rideRequest.price,
          status: rideRequest.status,
          createdAt: rideRequest.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create ride request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
