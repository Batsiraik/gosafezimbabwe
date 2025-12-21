import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/buses/bookings - Get all bookings for current user
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

    // Get all bookings for the user, ordered by travel date (upcoming first)
    const bookings = await prisma.busBooking.findMany({
      where: {
        userId: decoded.userId,
      },
      include: {
        busSchedule: {
          include: {
            fromCity: true,
            toCity: true,
          },
        },
      },
      orderBy: [
        { travelDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error('Error fetching bus bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bus bookings' },
      { status: 500 }
    );
  }
}
