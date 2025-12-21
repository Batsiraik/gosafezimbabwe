import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/home-services/requests/bid - Place a bid on a service request
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
    const { requestId, bidPrice, message } = body;

    if (!requestId || !bidPrice) {
      return NextResponse.json(
        { error: 'Request ID and bid price are required' },
        { status: 400 }
      );
    }

    if (bidPrice <= 0) {
      return NextResponse.json(
        { error: 'Bid price must be greater than 0' },
        { status: 400 }
      );
    }

    // Get provider profile
    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: decoded.userId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      );
    }

    if (!provider.isVerified) {
      return NextResponse.json(
        { error: 'Provider must be verified to place bids' },
        { status: 403 }
      );
    }

    // Get the service request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        service: true,
      },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Verify provider offers this service
    const providerOffersService = provider.services.some(
      sp => sp.service.id === serviceRequest.serviceId
    );

    if (!providerOffersService) {
      return NextResponse.json(
        { error: 'You do not offer this service' },
        { status: 403 }
      );
    }

    // Check if service request is still available
    if (serviceRequest.status !== 'pending' && serviceRequest.status !== 'searching' && serviceRequest.status !== 'bid_received') {
      return NextResponse.json(
        { error: 'Service request is no longer available' },
        { status: 400 }
      );
    }

    if (serviceRequest.providerId) {
      return NextResponse.json(
        { error: 'Service request has already been assigned' },
        { status: 400 }
      );
    }

    // Check if provider already has a bid on this request
    const existingBid = await prisma.serviceBid.findUnique({
      where: {
        serviceRequestId_serviceProviderId: {
          serviceRequestId: requestId,
          serviceProviderId: provider.id,
        },
      },
    });

    if (existingBid) {
      // Update existing bid
      const updatedBid = await prisma.serviceBid.update({
        where: { id: existingBid.id },
        data: {
          bidPrice,
          message: message || null,
          status: 'pending', // Reset to pending if it was rejected
        },
      });

      // Update request status to bid_received if not already
      if (serviceRequest.status !== 'bid_received') {
        await prisma.serviceRequest.update({
          where: { id: requestId },
          data: { status: 'bid_received' },
        });
      }

      return NextResponse.json({
        message: 'Bid updated successfully',
        bid: updatedBid,
      });
    }

    // Create new bid
    const newBid = await prisma.serviceBid.create({
      data: {
        serviceRequestId: requestId,
        serviceProviderId: provider.id,
        bidPrice,
        message: message || null,
        status: 'pending',
      },
    });

    // Update request status to bid_received if not already
    if (serviceRequest.status !== 'bid_received') {
      await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: 'bid_received' },
      });
    }

    return NextResponse.json({
      message: 'Bid placed successfully',
      bid: newBid,
    });
  } catch (error: any) {
    console.error('Error placing service bid:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You have already placed a bid on this request' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to place bid' },
      { status: 500 }
    );
  }
}
