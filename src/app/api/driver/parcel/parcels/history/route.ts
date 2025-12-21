import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/parcel/parcels/history - Get parcel driver delivery history
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

    // Get all parcels where driver was accepted
    const driverAcceptedParcels = await prisma.parcelRequest.findMany({
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

    // Format parcels
    const parcels = driverAcceptedParcels.map(parcel => ({
      ...parcel,
      driverBidPrice: parcel.finalPrice || parcel.price,
    }));

    // Calculate earnings
    const totalEarnings = parcels
      .filter(parcel => parcel.status === 'completed')
      .reduce((sum, parcel) => sum + (parcel.driverBidPrice || parcel.price), 0);

    // Group by status
    const completedParcels = parcels.filter(p => p.status === 'completed');
    const inProgressParcels = parcels.filter(p => p.status === 'in_progress');
    const acceptedParcelsList = parcels.filter(p => p.status === 'accepted');

    return NextResponse.json({
      parcels,
      stats: {
        total: parcels.length,
        completed: completedParcels.length,
        inProgress: inProgressParcels.length,
        accepted: acceptedParcelsList.length,
        totalEarnings,
      },
    });
  } catch (error) {
    console.error('Error fetching parcel history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parcel history' },
      { status: 500 }
    );
  }
}
