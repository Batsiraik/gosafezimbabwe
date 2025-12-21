import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/parcel/bids/pending - Get pending bids placed by this driver
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

    if (driver.serviceType !== 'parcel') {
      return NextResponse.json(
        { error: 'Not a parcel driver' },
        { status: 403 }
      );
    }

    // Get all pending bids placed by this driver
    const bids = await prisma.parcelBid.findMany({
      where: {
        driverId: driver.id,
        status: 'pending',
      },
      include: {
        parcelRequest: {
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
