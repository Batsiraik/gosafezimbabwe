import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/taxi/rides/bid - Create a bid on a ride
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

    if (!rideId || bidPrice === undefined) {
      return NextResponse.json(
        { error: 'Ride ID and bid price are required' },
        { status: 400 }
      );
    }

    if (bidPrice <= 0) {
      return NextResponse.json(
        { error: 'Bid price must be greater than 0' },
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

    if (!driver.isOnline) {
      return NextResponse.json(
        { error: 'Driver must be online to place bids' },
        { status: 400 }
      );
    }

    // Get the ride request
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
      include: {
        bids: {
          where: {
            driverId: driver.id,
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

    if (ride.status !== 'searching' && ride.status !== 'bid_received') {
      return NextResponse.json(
        { error: 'Ride is no longer accepting bids' },
        { status: 400 }
      );
    }

    if (ride.driverId) {
      return NextResponse.json(
        { error: 'Ride has already been accepted by another driver' },
        { status: 400 }
      );
    }

    // Check if driver already has a bid on this ride
    const existingBid = await prisma.rideBid.findUnique({
      where: {
        rideRequestId_driverId: {
          rideRequestId: rideId,
          driverId: driver.id,
        },
      },
    });

    if (existingBid) {
      // Update existing bid
      const updatedBid = await prisma.rideBid.update({
        where: { id: existingBid.id },
        data: {
          bidPrice,
          status: 'pending', // Reset to pending if updating
        },
        include: {
          driver: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
            },
          },
        },
      });

      // Update ride status to bid_received if not already
      if (ride.status === 'searching' || ride.status === 'pending') {
        await prisma.rideRequest.update({
          where: { id: rideId },
          data: { status: 'bid_received' },
        });
      }

      return NextResponse.json({
        message: 'Bid updated successfully',
        bid: updatedBid,
      });
    }

    // Create new bid
    const bid = await prisma.rideBid.create({
      data: {
        rideRequestId: rideId,
        driverId: driver.id,
        bidPrice,
        status: 'pending',
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
        rideRequest: {
          select: {
            id: true,
            pickupAddress: true,
            destinationAddress: true,
            price: true,
          },
        },
      },
    });

    // Update ride status to bid_received if not already
    if (ride.status === 'searching' || ride.status === 'pending') {
      await prisma.rideRequest.update({
        where: { id: rideId },
        data: { status: 'bid_received' },
      });
    }

    return NextResponse.json({
      message: 'Bid placed successfully',
      bid,
    });
  } catch (error) {
    console.error('Error placing bid:', error);
    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}
