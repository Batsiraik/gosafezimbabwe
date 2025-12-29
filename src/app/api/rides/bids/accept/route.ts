import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { notifyRideBidAccepted } from '@/lib/notifications';

// POST /api/rides/bids/accept - Accept a driver's bid
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
    const { bidId } = body;

    if (!bidId) {
      return NextResponse.json(
        { error: 'Bid ID is required' },
        { status: 400 }
      );
    }

    // Get the bid
    const bid = await prisma.rideBid.findUnique({
      where: { id: bidId },
      include: {
        rideRequest: {
          select: {
            id: true,
            userId: true,
            status: true,
            driverId: true,
          },
        },
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
    });

    if (!bid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Verify the ride belongs to the user
    if (bid.rideRequest.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to accept this bid' },
        { status: 403 }
      );
    }

    // Check if ride is still available
    if (bid.rideRequest.status !== 'searching' && bid.rideRequest.status !== 'bid_received') {
      return NextResponse.json(
        { error: 'Ride is no longer available' },
        { status: 400 }
      );
    }

    if (bid.rideRequest.driverId) {
      return NextResponse.json(
        { error: 'Ride has already been accepted' },
        { status: 400 }
      );
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return NextResponse.json(
        { error: 'Bid is no longer available' },
        { status: 400 }
      );
    }

    // Use transaction to update bid, ride, and reject other bids
    const result = await prisma.$transaction(async (tx) => {
      // Accept the selected bid
      const acceptedBid = await tx.rideBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });

      // Reject all other pending bids for this ride
      await tx.rideBid.updateMany({
        where: {
          rideRequestId: bid.rideRequest.id,
          id: { not: bidId },
          status: 'pending',
        },
        data: { status: 'rejected' },
      });

      // Update the ride request
      const updatedRide = await tx.rideRequest.update({
        where: { id: bid.rideRequest.id },
        data: {
          driverId: bid.driverId,
          finalPrice: bid.bidPrice,
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
      });

      return { acceptedBid, updatedRide };
    });

    // Notify driver that their bid was accepted (async, don't wait)
    notifyRideBidAccepted(
      bid.driver.user.id,
      bid.rideRequest.id,
      result.updatedRide.user.fullName
    ).catch((error) => {
      console.error('Error sending bid accepted notification:', error);
    });

    return NextResponse.json({
      message: 'Bid accepted successfully',
      ride: result.updatedRide,
      bid: result.acceptedBid,
    });
  } catch (error) {
    console.error('Error accepting bid:', error);
    return NextResponse.json(
      { error: 'Failed to accept bid' },
      { status: 500 }
    );
  }
}
