import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/bus/bookings/confirm - Confirm a bus booking
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
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
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

    // Get the booking
    const booking = await prisma.busBooking.findUnique({
      where: { id: bookingId },
      include: {
        busSchedule: {
          include: {
            busProvider: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify the booking belongs to this provider's schedule
    if (!booking.busSchedule.busProvider || booking.busSchedule.busProvider.id !== provider.id) {
      return NextResponse.json(
        { error: 'Unauthorized to confirm this booking' },
        { status: 403 }
      );
    }

    // Check if booking can be confirmed
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot confirm a cancelled booking' },
        { status: 400 }
      );
    }

    if (booking.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Booking is already confirmed' },
        { status: 400 }
      );
    }

    // Update booking status to confirmed
    const updatedBooking = await prisma.busBooking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
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
    });

    return NextResponse.json({
      message: 'Booking confirmed successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return NextResponse.json(
      { error: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}
