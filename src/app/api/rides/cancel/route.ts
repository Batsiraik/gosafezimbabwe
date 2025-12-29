import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

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
    const { rideId, reason, customReason } = body;

    if (!rideId) {
      return NextResponse.json(
        { error: 'Ride ID is required' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      );
    }

    // Verify the ride belongs to the user
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    if (ride.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Allow cancellation at any time (except if already cancelled)
    if (ride.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Ride is already cancelled' },
        { status: 400 }
      );
    }

    // If ride has a driver assigned (accepted or in_progress), we should still allow cancellation
    // The driver will see it removed from their accepted rides on next poll
    const cancelledRide = await prisma.$transaction(async (tx) => {
      // Update ride status to cancelled
      const updatedRide = await tx.rideRequest.update({
        where: { id: rideId },
        data: { status: 'cancelled' },
      });

      // Save cancellation reason
      await tx.rideCancellationReason.create({
        data: {
          rideRequestId: rideId,
          reason: reason,
          customReason: reason === 'Other' ? customReason : null,
        },
      });

      return updatedRide;
    });

    // If there were pending bids, we could optionally reject them
    // But for now, we'll just cancel the ride and let the driver's polling handle it

    return NextResponse.json(
      {
        message: 'Ride cancelled successfully',
        rideRequest: {
          id: cancelledRide.id,
          status: cancelledRide.status,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cancel ride error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
