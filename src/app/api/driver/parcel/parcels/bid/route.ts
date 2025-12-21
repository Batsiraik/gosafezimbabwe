import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/parcel/parcels/bid - Place a bid on a parcel request
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { parcelId, bidPrice } = body;

    if (!parcelId || !bidPrice) {
      return NextResponse.json(
        { error: 'Parcel ID and bid price are required' },
        { status: 400 }
      );
    }

    if (bidPrice <= 0) {
      return NextResponse.json(
        { error: 'Bid price must be greater than 0' },
        { status: 400 }
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

    if (!driver.isOnline) {
      return NextResponse.json(
        { error: 'Driver must be online to place bids' },
        { status: 400 }
      );
    }

    // Get the parcel request
    const parcel = await prisma.parcelRequest.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: 'Parcel request not found' },
        { status: 404 }
      );
    }

    // Check if parcel is still available (pending, searching, or bid_received are all acceptable)
    if (parcel.status !== 'pending' && parcel.status !== 'searching' && parcel.status !== 'bid_received') {
      return NextResponse.json(
        { error: 'Parcel request is no longer available' },
        { status: 400 }
      );
    }

    if (parcel.driverId) {
      return NextResponse.json(
        { error: 'Parcel has already been assigned' },
        { status: 400 }
      );
    }

    // Check if driver already has a bid on this parcel
    const existingBid = await prisma.parcelBid.findUnique({
      where: {
        parcelRequestId_driverId: {
          parcelRequestId: parcelId,
          driverId: driver.id,
        },
      },
    });

    if (existingBid) {
      // Update existing bid
      const updatedBid = await prisma.parcelBid.update({
        where: { id: existingBid.id },
        data: {
          bidPrice,
          status: 'pending', // Reset to pending if it was rejected
        },
      });

      // Update parcel status to bid_received if not already
      if (parcel.status !== 'bid_received') {
        await prisma.parcelRequest.update({
          where: { id: parcelId },
          data: { status: 'bid_received' },
        });
      }

      return NextResponse.json({
        message: 'Bid updated successfully',
        bid: updatedBid,
      });
    }

    // Create new bid
    const newBid = await prisma.parcelBid.create({
      data: {
        parcelRequestId: parcelId,
        driverId: driver.id,
        bidPrice,
        status: 'pending',
      },
    });

    // Update parcel status to bid_received if not already
    if (parcel.status !== 'bid_received') {
      await prisma.parcelRequest.update({
        where: { id: parcelId },
        data: { status: 'bid_received' },
      });
    }

    return NextResponse.json({
      message: 'Bid placed successfully',
      bid: newBid,
    });
  } catch (error: any) {
    console.error('Error placing parcel bid:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You have already placed a bid on this parcel' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}
