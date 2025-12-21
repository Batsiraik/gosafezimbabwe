import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/parcel/status - Get parcel driver status and profile
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

    const driver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
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

    if (!driver) {
      return NextResponse.json({ driver: null });
    }

    // Only return if service type is parcel
    if (driver.serviceType !== 'parcel') {
      return NextResponse.json({ driver: null });
    }

    // Get driver's average rating (ratings received by this driver)
    const ratings = await prisma.rating.findMany({
      where: { rateeId: driver.user.id },
      select: { rating: true },
    });

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return NextResponse.json({
      driver: {
        id: driver.id,
        licenseNumber: driver.licenseNumber,
        carRegistration: driver.carRegistration, // This is bike registration for parcel drivers
        isVerified: driver.isVerified,
        isOnline: driver.isOnline,
        currentLat: driver.currentLat,
        currentLng: driver.currentLng,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching parcel driver status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver status' },
      { status: 500 }
    );
  }
}
