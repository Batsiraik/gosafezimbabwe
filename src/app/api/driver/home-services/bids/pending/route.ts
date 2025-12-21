import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/home-services/bids/pending - Get pending bids placed by this provider
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

    // Get all pending bids placed by this provider
    const bids = await prisma.serviceBid.findMany({
      where: {
        serviceProviderId: provider.id,
        status: 'pending',
      },
      include: {
        serviceRequest: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      bids,
      count: bids.length,
    });
  } catch (error) {
    console.error('Error fetching pending bids:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending bids' },
      { status: 500 }
    );
  }
}
