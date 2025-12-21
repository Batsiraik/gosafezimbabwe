import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/parcels/bids?parcelId=xxx - Get all bids for a parcel
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
    const parcelId = searchParams.get('parcelId');

    if (!parcelId) {
      return NextResponse.json(
        { error: 'Parcel ID is required' },
        { status: 400 }
      );
    }

    // Verify the parcel belongs to the user
    const parcel = await prisma.parcelRequest.findUnique({
      where: { id: parcelId },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: 'Parcel not found' },
        { status: 404 }
      );
    }

    if (parcel.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this parcel' },
        { status: 403 }
      );
    }

    // Get all pending bids for this parcel
    const bids = await prisma.parcelBid.findMany({
      where: {
        parcelRequestId: parcelId,
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
    console.error('Error fetching parcel bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}
