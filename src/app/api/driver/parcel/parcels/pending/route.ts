import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/parcel/parcels/pending - Get pending parcel requests within 5km
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

    if (!driver.isVerified) {
      return NextResponse.json(
        { error: 'Driver not verified' },
        { status: 403 }
      );
    }

    // Driver must be online to see pending parcels
    if (!driver.isOnline) {
      return NextResponse.json({
        parcels: [],
        message: 'Driver is offline',
      });
    }

    if (!driver.currentLat || !driver.currentLng) {
      // Return empty array instead of error - location might not be set yet
      return NextResponse.json({
        parcels: [],
        message: 'Driver location not available yet. Please wait for location to update.',
      });
    }

    // Get all pending parcel requests (status: pending, searching, or bid_received, no driver assigned)
    // bid_received means drivers have bid but user hasn't accepted yet - other drivers can still bid
    const allParcels = await prisma.parcelRequest.findMany({
      where: {
        status: {
          in: ['pending', 'searching', 'bid_received'],
        },
        driverId: null, // Not assigned to any driver yet
        vehicleType: 'motorbike', // Only motorbike parcels
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        bids: {
          where: {
            driverId: driver.id,
            status: 'pending', // Only count pending bids from this driver
          },
        },
      },
    });

    // Filter out parcels where this driver has already placed a bid
    // Those should appear in "My Pending Bids" instead
    const parcelsWithoutDriverBid = allParcels.filter(parcel => {
      // Exclude if this driver has already bid on this parcel
      return parcel.bids.length === 0;
    });

    // Calculate distance and filter parcels within 5km
    // Also remove the bids array from the response (it was only used for filtering)
    const parcelsWithinRange = parcelsWithoutDriverBid
      .map((parcel) => {
        const distance = calculateDistance(
          driver.currentLat!,
          driver.currentLng!,
          parcel.pickupLat,
          parcel.pickupLng
        );
        // Remove bids from the response - it was only used for filtering
        const { bids, ...parcelWithoutBids } = parcel;
        return {
          ...parcelWithoutBids,
          distanceFromDriver: distance,
        };
      })
      .filter((parcel) => parcel.distanceFromDriver <= 5)
      .sort((a, b) => a.distanceFromDriver - b.distanceFromDriver);

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Parcel Driver] Found ${allParcels.length} total parcels, ${parcelsWithoutDriverBid.length} without driver bid, ${parcelsWithinRange.length} within 5km`);
    }

    return NextResponse.json({
      parcels: parcelsWithinRange,
      count: parcelsWithinRange.length,
    });
  } catch (error) {
    console.error('Error fetching pending parcels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending parcels' },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
