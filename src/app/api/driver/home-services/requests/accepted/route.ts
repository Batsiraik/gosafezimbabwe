import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/home-services/requests/accepted - Get accepted service requests for this provider
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
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      );
    }

    // Get all service requests where this provider was accepted (excluding completed - those go to history)
    const acceptedRequests = await prisma.serviceRequest.findMany({
      where: {
        providerId: provider.id,
        status: {
          in: ['accepted', 'in_progress'], // Exclude completed - those are in history
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
        service: {
          select: {
            id: true,
            name: true,
            iconName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      requests: acceptedRequests,
      count: acceptedRequests.length,
    });
  } catch (error) {
    console.error('Error fetching accepted requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accepted requests' },
      { status: 500 }
    );
  }
}
