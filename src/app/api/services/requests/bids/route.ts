import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/services/requests/bids?requestId=xxx - Get all bids for a service request
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
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Verify the request belongs to the user
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    if (serviceRequest.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this request' },
        { status: 403 }
      );
    }

    // Get all pending bids for this request
    const bids = await prisma.serviceBid.findMany({
      where: {
        serviceRequestId: requestId,
        status: 'pending',
      },
      include: {
        serviceProvider: {
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

    // Get average ratings for each provider
    const bidsWithRatings = await Promise.all(
      bids.map(async (bid) => {
        const ratings = await prisma.rating.findMany({
          where: { rateeId: bid.serviceProvider.user.id },
          select: { rating: true },
        });

        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;

        return {
          ...bid,
          serviceProvider: {
            ...bid.serviceProvider,
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
    console.error('Error fetching service bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bids' },
      { status: 500 }
    );
  }
}
