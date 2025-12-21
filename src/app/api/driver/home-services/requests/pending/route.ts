import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/home-services/requests/pending - Get pending service requests for services this provider offers
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

    // Get provider profile
    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: decoded.userId },
      include: {
        services: {
          include: {
            service: {
              select: {
                id: true,
              },
            },
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
        { error: 'Provider not verified' },
        { status: 403 }
      );
    }

    // Get service IDs this provider offers
    const serviceIds = provider.services.map(sp => sp.service.id);

    if (serviceIds.length === 0) {
      return NextResponse.json({
        requests: [],
        message: 'No services selected',
      });
    }

    // Get all pending service requests for services this provider offers
    // Status: pending, searching, or bid_received (other providers can still bid)
    const allRequests = await prisma.serviceRequest.findMany({
      where: {
        serviceId: { in: serviceIds },
        status: {
          in: ['pending', 'searching', 'bid_received'],
        },
        providerId: null, // Not assigned to any provider yet
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
        bids: {
          where: {
            serviceProviderId: provider.id,
            status: 'pending', // Only count pending bids from this provider
          },
        },
      },
    });

    // Filter out requests where this provider has already placed a bid
    // Those should appear in "My Pending Bids" instead
    const requestsWithoutProviderBid = allRequests.filter(request => request.bids.length === 0);

    // Remove bids array from response (it was only used for filtering)
    const formattedRequests = requestsWithoutProviderBid.map(request => {
      const { bids, ...requestWithoutBids } = request;
      return requestWithoutBids;
    });

    return NextResponse.json({
      requests: formattedRequests,
      count: formattedRequests.length,
    });
  } catch (error) {
    console.error('Error fetching pending service requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending requests' },
      { status: 500 }
    );
  }
}
