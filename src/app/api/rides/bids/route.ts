import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/rides/bids?rideId=xxx - Get all bids for a ride
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

    // Verify the ride belongs to the user
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideId },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!ride) {
      return NextResponse.json(
        { error: 'Ride not found' },
        { status: 404 }
      );
    }

    if (ride.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this ride' },
        { status: 403 }
      );
    }

    // Get all pending bids for this ride
    const bids = await prisma.rideBid.findMany({
      where: {
        rideRequestId: rideId,
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
                profilePictureUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        bidPrice: 'asc', // Sort by price (lowest first)
      },
    });

    // Get average ratings for each driver
    const bidsWithRatings = await Promise.all(
      bids.map(async (bid) => {
        const ratings = await prisma.rating.findMany({
          where: { rateeId: bid.driver.user.id },
          select: { rating: true },
        });

        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;

        return {
          ...bid,
          driver: {
            ...bid.driver,
            averageRating: Math.round(averageRating * 10) / 10,
            totalRatings: ratings.length,
          },
        };
      })
    );

    return NextResponse.json({
      bids: bidsWithRatings,
      count: bidsWithRatings.length,
    });
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}
