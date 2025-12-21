import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/rides/history - Get user's ride history
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

    // Get all rides for this user (all statuses)
    const rides = await prisma.rideRequest.findMany({
      where: {
        userId: decoded.userId,
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
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

    // Format rides
    const formattedRides = rides.map(ride => ({
      id: ride.id,
      pickupAddress: ride.pickupAddress,
      destinationAddress: ride.destinationAddress,
      distance: ride.distance,
      price: ride.price,
      finalPrice: ride.finalPrice,
      status: ride.status,
      isRoundTrip: ride.isRoundTrip,
      createdAt: ride.createdAt,
      driver: ride.driver ? {
        fullName: ride.driver.user.fullName,
        phone: ride.driver.user.phone,
        licenseNumber: ride.driver.licenseNumber || '',
        carRegistration: ride.driver.carRegistration || '',
      } : null,
    }));

    return NextResponse.json({
      rides: formattedRides,
      count: formattedRides.length,
    });
  } catch (error) {
    console.error('Error fetching ride history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ride history' },
      { status: 500 }
    );
  }
}
