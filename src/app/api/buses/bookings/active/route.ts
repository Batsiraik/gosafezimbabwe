import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/buses/bookings/active - Get active bus booking for current user
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

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active booking (pending or confirmed, travel date is today or in the future)
    const activeBooking = await prisma.busBooking.findFirst({
      where: {
        userId: decoded.userId,
        travelDate: {
          gte: today,
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      include: {
        busSchedule: {
          include: {
            fromCity: true,
            toCity: true,
            busProvider: {
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

    if (!activeBooking) {
      return NextResponse.json({ booking: null });
    }

    return NextResponse.json({ booking: activeBooking });
  } catch (error) {
    console.error('Error fetching active bus booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active booking' },
      { status: 500 }
    );
  }
}
