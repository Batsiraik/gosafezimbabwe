import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/services/requests/active - Get active service request for current user
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

    // Find active service request (including completed if not rated yet)
    const activeRequests = await prisma.serviceRequest.findMany({
      where: {
        userId: decoded.userId,
        status: {
          in: ['pending', 'searching', 'bid_received', 'accepted', 'in_progress', 'completed'],
        },
      },
      include: {
        service: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (activeRequests.length === 0) {
      return NextResponse.json({ request: null });
    }

    let activeRequest = activeRequests[0];

    // If request is completed, check if user has already rated
    if (activeRequest.status === 'completed' && activeRequest.providerId && activeRequest.provider) {
      const providerUserId = activeRequest.provider.user.id;
      
      // Check if user has already rated this provider for this request
      const existingRating = await prisma.rating.findFirst({
        where: {
          serviceRequestId: activeRequest.id,
          raterId: decoded.userId,
          rateeId: providerUserId,
        },
      });

      // If user has already rated, don't show this as active request
      if (existingRating) {
        return NextResponse.json({ request: null });
      }
    }

    // Prepare provider info if request is accepted and has a provider
    let providerInfo = null;
    if (activeRequest.providerId && activeRequest.provider && activeRequest.provider.user) {
      providerInfo = {
        id: activeRequest.provider.id,
        userId: activeRequest.provider.user.id, // Add userId for rating
        fullName: activeRequest.provider.user.fullName,
        phone: activeRequest.provider.user.phone,
      };
    }

    // Prepare user info
    let userInfo = null;
    if (activeRequest.user) {
      userInfo = {
        id: activeRequest.user.id,
        fullName: activeRequest.user.fullName,
        phone: activeRequest.user.phone,
      };
    }

    return NextResponse.json({
      request: {
        ...activeRequest,
        price: activeRequest.finalPrice || activeRequest.budget, // Use finalPrice (bid price) if available
        originalPrice: activeRequest.budget, // Keep original for reference
        provider: providerInfo,
        user: userInfo,
      },
    });
  } catch (error) {
    console.error('Error fetching active service request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active service request' },
      { status: 500 }
    );
  }
}
