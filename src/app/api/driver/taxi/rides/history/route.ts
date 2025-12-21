import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/taxi/rides/history - Get driver ride history
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

    // Get all rides where driver has bids (accepted or pending)
    const driverBids = await prisma.rideBid.findMany({
      where: {
        driverId: driver.id,
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

    // Get all rides where driver was accepted
    const driverAcceptedRides = await prisma.rideRequest.findMany({
      where: {
        driverId: driver.id,
        status: {
          in: ['accepted', 'in_progress', 'completed'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format rides
    const rides = driverAcceptedRides.map(ride => ({
      ...ride,
      driverBidPrice: ride.finalPrice || ride.price,
    }));

    // Calculate earnings
    const totalEarnings = rides
      .filter(ride => ride.status === 'completed')
      .reduce((sum, ride) => sum + (ride.driverBidPrice || ride.price), 0);

    // Group by status
    const completedRides = rides.filter(r => r.status === 'completed');
    const inProgressRides = rides.filter(r => r.status === 'in_progress');
    const acceptedRidesList = rides.filter(r => r.status === 'accepted');

    return NextResponse.json({
      rides,
      stats: {
        total: rides.length,
        completed: completedRides.length,
        inProgress: inProgressRides.length,
        accepted: acceptedRidesList.length,
        totalEarnings,
      },
    });
  } catch (error) {
    console.error('Error fetching ride history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ride history' },
      { status: 500 }
    );
  }
}
