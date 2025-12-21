import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as { userId: string; phone: string };

    // Get active parcel requests for this user
    // Active statuses: pending, searching, bid_received, accepted, in_progress, completed (if not rated yet)
    const activeParcels = await prisma.parcelRequest.findMany({
      where: {
        userId: decoded.userId,
        status: {
          in: ['pending', 'searching', 'bid_received', 'accepted', 'in_progress', 'completed'],
        },
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
        createdAt: 'desc',
      },
      take: 1, // Get the most recent active parcel
    });

    if (activeParcels.length === 0) {
      return NextResponse.json(
        { activeParcel: null },
        { status: 200 }
      );
    }

    let activeParcel = activeParcels[0];

    // If parcel is completed, check if user has already rated
    // If they have rated, exclude it from active parcels
    if (activeParcel.status === 'completed' && activeParcel.driverId && activeParcel.driver && activeParcel.driver.user) {
      const driverUserId = activeParcel.driver.user.id;
      
      // Check if user has already rated this driver for this parcel
      const existingRating = await prisma.rating.findFirst({
        where: {
          parcelRequestId: activeParcel.id,
          raterId: decoded.userId,
          rateeId: driverUserId,
        },
      });

      // If user has already rated, don't show this as active parcel
      if (existingRating) {
        return NextResponse.json(
          { activeParcel: null },
          { status: 200 }
        );
      }
    }

    // Prepare driver info if parcel is accepted and has a driver
    let driverInfo = null;
    if (activeParcel.driverId && activeParcel.driver && activeParcel.driver.user) {
      driverInfo = {
        id: activeParcel.driver.id,
        userId: activeParcel.driver.user.id, // Add userId for rating
        fullName: activeParcel.driver.user.fullName,
        phone: activeParcel.driver.user.phone,
        licenseNumber: activeParcel.driver.licenseNumber || '',
        bikeRegistration: activeParcel.driver.carRegistration || '', // Using carRegistration for bike registration
      };
    }

    return NextResponse.json(
      {
        activeParcel: {
          id: activeParcel.id,
          vehicleType: activeParcel.vehicleType,
          pickupAddress: activeParcel.pickupAddress,
          deliveryAddress: activeParcel.deliveryAddress,
          distance: activeParcel.distance,
          price: activeParcel.finalPrice || activeParcel.price, // Use finalPrice (bid price) if available
          originalPrice: activeParcel.price, // Keep original for reference
          status: activeParcel.status,
          createdAt: activeParcel.createdAt,
          updatedAt: activeParcel.updatedAt,
          driver: driverInfo,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get active parcel error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error.message || String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
