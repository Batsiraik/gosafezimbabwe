import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/parcels/bids/accept - Accept a driver's bid
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
    const { bidId } = body;

    if (!bidId) {
      return NextResponse.json(
        { error: 'Bid ID is required' },
        { status: 400 }
      );
    }

    // Get the bid
    const bid = await prisma.parcelBid.findUnique({
      where: { id: bidId },
      include: {
        parcelRequest: {
          select: {
            id: true,
            userId: true,
            status: true,
            driverId: true,
          },
        },
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
    });

    if (!bid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      );
    }

    // Verify the parcel belongs to the user
    if (bid.parcelRequest.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to accept this bid' },
        { status: 403 }
      );
    }

    // Check if parcel is still available
    if (bid.parcelRequest.status !== 'searching' && bid.parcelRequest.status !== 'bid_received') {
      return NextResponse.json(
        { error: 'Parcel is no longer available' },
        { status: 400 }
      );
    }

    if (bid.parcelRequest.driverId) {
      return NextResponse.json(
        { error: 'Parcel has already been accepted' },
        { status: 400 }
      );
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return NextResponse.json(
        { error: 'Bid is no longer available' },
        { status: 400 }
      );
    }

    // Use transaction to update bid, parcel, and reject other bids
    const result = await prisma.$transaction(async (tx) => {
      // Accept the selected bid
      const acceptedBid = await tx.parcelBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });

      // Reject all other pending bids for this parcel
      await tx.parcelBid.updateMany({
        where: {
          parcelRequestId: bid.parcelRequest.id,
          id: { not: bidId },
          status: 'pending',
        },
        data: { status: 'rejected' },
      });

      // Update the parcel request
      const updatedParcel = await tx.parcelRequest.update({
        where: { id: bid.parcelRequest.id },
        data: {
          driverId: bid.driverId,
          finalPrice: bid.bidPrice,
          status: 'accepted',
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
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
      });

      return { acceptedBid, updatedParcel };
    });

    return NextResponse.json({
      message: 'Bid accepted successfully',
      parcel: result.updatedParcel,
      bid: result.acceptedBid,
    });
  } catch (error) {
    console.error('Error accepting parcel bid:', error);
    return NextResponse.json(
      { error: 'Failed to accept bid' },
      { status: 500 }
    );
  }
}
