import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/bus/bookings - Get all bookings for this bus provider's schedules
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

    // Get bus provider profile
    const provider = await prisma.busProvider.findUnique({
      where: { userId: decoded.userId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Bus provider profile not found' },
        { status: 404 }
      );
    }

    // Get all schedules for this provider
    const schedules = await prisma.busSchedule.findMany({
      where: {
        busProviderId: provider.id,
      },
      select: {
        id: true,
      },
    });

    const scheduleIds = schedules.map(s => s.id);

    if (scheduleIds.length === 0) {
      return NextResponse.json({
        bookings: [],
        count: 0,
      });
    }

    // Get all bookings for these schedules
    const bookings = await prisma.busBooking.findMany({
      where: {
        busScheduleId: {
          in: scheduleIds,
        },
        status: {
          not: 'cancelled',
        },
      },
      include: {
        busSchedule: {
          include: {
            fromCity: {
              select: {
                id: true,
                name: true,
              },
            },
            toCity: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        travelDate: 'asc',
      },
    });

    return NextResponse.json({
      bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error('Error fetching bus provider bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
