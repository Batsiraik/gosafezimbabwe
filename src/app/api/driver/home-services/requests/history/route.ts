import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/home-services/requests/history - Get service request history for this provider
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Optional: filter by status
    const dateFrom = searchParams.get('dateFrom'); // Optional: filter from date
    const dateTo = searchParams.get('dateTo'); // Optional: filter to date

    // Build where clause
    const where: any = {
      providerId: provider.id,
    };

    // Filter by status if provided
    if (status) {
      where.status = status;
    } else {
      // Default: show completed and cancelled requests
      where.status = {
        in: ['completed', 'cancelled'],
      };
    }

    // Filter by date range if provided
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Get service request history
    const history = await prisma.serviceRequest.findMany({
      where,
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

    // Calculate statistics
    const totalCompleted = await prisma.serviceRequest.count({
      where: {
        providerId: provider.id,
        status: 'completed',
      },
    });

    const totalEarnings = await prisma.serviceRequest.aggregate({
      where: {
        providerId: provider.id,
        status: 'completed',
      },
      _sum: {
        finalPrice: true,
      },
    });

    return NextResponse.json({
      history,
      statistics: {
        totalCompleted,
        totalEarnings: totalEarnings._sum.finalPrice || 0,
      },
      count: history.length,
    });
  } catch (error) {
    console.error('Error fetching service request history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
