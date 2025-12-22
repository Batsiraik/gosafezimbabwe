import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

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

    if (!decoded.adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all stats
    const [
      totalUsers,
      totalTaxiDrivers,
      totalParcelProviders,
      totalHomeServiceProviders,
      totalBusProviders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.driver.count({ where: { serviceType: 'taxi', isVerified: true } }),
      prisma.driver.count({ where: { serviceType: 'parcel', isVerified: true } }),
      prisma.serviceProvider.count({ where: { isVerified: true } }),
      prisma.busProvider.count({ where: { isVerified: true } }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalTaxiDrivers,
      totalParcelProviders,
      totalHomeServiceProviders,
      totalBusProviders,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
