import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/home-services/status - Get home service provider status and profile
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

    const provider = await prisma.serviceProvider.findUnique({
      where: { userId: decoded.userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        services: {
          include: {
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
    });

    if (!provider) {
      return NextResponse.json({ provider: null });
    }

    // Check if user relation exists
    if (!provider.user) {
      console.error('Provider found but user relation is missing');
      return NextResponse.json(
        { error: 'Provider data incomplete' },
        { status: 500 }
      );
    }

    // Get provider's average rating (ratings received by this provider)
    const ratings = await prisma.rating.findMany({
      where: { rateeId: provider.user.id },
      select: { rating: true },
    });

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return NextResponse.json({
      provider: {
        id: provider.id,
        isVerified: provider.isVerified,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        services: provider.services?.map(sp => ({
          id: sp.service.id,
          name: sp.service.name,
          iconName: sp.service.iconName,
        })) || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching home service provider status:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch provider status',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
