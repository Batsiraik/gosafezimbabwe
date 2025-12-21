import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/taxi/bids/pending - Get driver's pending bids
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

    // Get all pending bids for this driver
    // Only include bids where:
    // 1. Bid status is 'pending'
    // 2. Ride status is still 'searching' or 'bid_received' (not cancelled or accepted by another driver)
    // 3. Ride doesn't have a driverId set (meaning no driver has been accepted yet)
    const bids = await prisma.rideBid.findMany({
      where: {
        driverId: driver.id,
        status: 'pending',
        rideRequest: {
          status: {
            in: ['searching', 'bid_received'],
          },
          driverId: null, // No driver has been accepted yet
        },
      },
      include: {
        rideRequest: {
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
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      bids,
      count: bids.length,
    });
  } catch (error) {
    console.error('Error fetching pending bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending bids' },
      { status: 500 }
    );
  }
}
