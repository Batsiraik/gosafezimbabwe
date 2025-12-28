import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { notifyServiceBidAccepted } from '@/lib/notifications';

// POST /api/services/requests/bids/accept - Accept a provider's bid
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
    const bid = await prisma.serviceBid.findUnique({
      where: { id: bidId },
      include: {
        serviceRequest: {
          select: {
            id: true,
            userId: true,
            status: true,
            providerId: true,
          },
        },
        serviceProvider: {
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

    // Verify the request belongs to the user
    if (bid.serviceRequest.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to accept this bid' },
        { status: 403 }
      );
    }

    // Check if request is still available
    if (bid.serviceRequest.status !== 'searching' && bid.serviceRequest.status !== 'bid_received') {
      return NextResponse.json(
        { error: 'Service request is no longer available' },
        { status: 400 }
      );
    }

    if (bid.serviceRequest.providerId) {
      return NextResponse.json(
        { error: 'Service request has already been accepted' },
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

    // Use transaction to update bid, request, and reject other bids
    const result = await prisma.$transaction(async (tx) => {
      // Accept the selected bid
      const acceptedBid = await tx.serviceBid.update({
        where: { id: bidId },
        data: { status: 'accepted' },
      });

      // Reject all other pending bids for this request
      await tx.serviceBid.updateMany({
        where: {
          serviceRequestId: bid.serviceRequest.id,
          id: { not: bidId },
          status: 'pending',
        },
        data: { status: 'rejected' },
      });

      // Update the service request
      const updatedRequest = await tx.serviceRequest.update({
        where: { id: bid.serviceRequest.id },
        data: {
          providerId: bid.serviceProviderId,
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
          service: {
            select: {
              id: true,
              name: true,
              iconName: true,
            },
          },
          provider: {
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

      return { acceptedBid, updatedRequest };
    });

    // Notify provider that their bid was accepted (async, don't wait)
    notifyServiceBidAccepted(
      bid.serviceProvider.user.id,
      bid.serviceRequest.id,
      result.updatedRequest.user.fullName
    ).catch((error) => {
      console.error('Error sending service bid accepted notification:', error);
    });

    return NextResponse.json({
      message: 'Bid accepted successfully',
      request: result.updatedRequest,
      bid: result.acceptedBid,
    });
  } catch (error) {
    console.error('Error accepting service bid:', error);
    return NextResponse.json(
      { error: 'Failed to accept bid' },
      { status: 500 }
    );
  }
}
