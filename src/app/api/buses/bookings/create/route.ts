import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/buses/bookings/create - Create a bus booking
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
    const { busScheduleId, travelDate, numberOfTickets } = body;

    // Validate required fields
    if (!busScheduleId || !travelDate || !numberOfTickets) {
      return NextResponse.json(
        { error: 'Missing required fields: busScheduleId, travelDate, numberOfTickets' },
        { status: 400 }
      );
    }

    // Validate number of tickets
    if (numberOfTickets < 1) {
      return NextResponse.json(
        { error: 'Number of tickets must be at least 1' },
        { status: 400 }
      );
    }

    // Get the bus schedule
    const busSchedule = await prisma.busSchedule.findUnique({
      where: { id: busScheduleId },
      include: {
        fromCity: true,
        toCity: true,
        busProvider: {
          select: {
            isVerified: true,
          },
        },
      },
    });

    if (!busSchedule || !busSchedule.isActive) {
      return NextResponse.json(
        { error: 'Bus schedule not found or inactive' },
        { status: 404 }
      );
    }

    // Verify the schedule is from a verified provider
    if (!busSchedule.busProvider || !busSchedule.busProvider.isVerified) {
      return NextResponse.json(
        { error: 'This bus schedule is not available' },
        { status: 403 }
      );
    }

    // Parse travel date
    const travelDateObj = new Date(travelDate);
    if (isNaN(travelDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid travel date format' },
        { status: 400 }
      );
    }

    // Check if travel date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDateObj < today) {
      return NextResponse.json(
        { error: 'Travel date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check available seats for this date
    const existingBookings = await prisma.busBooking.findMany({
      where: {
        busScheduleId,
        travelDate: {
          gte: new Date(travelDateObj.setHours(0, 0, 0, 0)),
          lt: new Date(travelDateObj.setHours(23, 59, 59, 999)),
        },
        status: {
          not: 'cancelled',
        },
      },
    });

    const bookedSeats = existingBookings.reduce((sum, booking) => sum + booking.numberOfTickets, 0);
    const availableSeats = busSchedule.totalSeats - bookedSeats;

    if (numberOfTickets > availableSeats) {
      return NextResponse.json(
        { error: `Only ${availableSeats} seat(s) available for this date` },
        { status: 400 }
      );
    }

    // Calculate total price
    const totalPrice = busSchedule.price * numberOfTickets;

    // Create the booking
    const booking = await prisma.busBooking.create({
      data: {
        userId: decoded.userId,
        busScheduleId,
        travelDate: travelDateObj,
        numberOfTickets,
        totalPrice,
        status: 'pending',
      },
      include: {
        busSchedule: {
          include: {
            fromCity: true,
            toCity: true,
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
      message: 'Bus booking created successfully',
      booking,
    });
  } catch (error) {
    console.error('Error creating bus booking:', error);
    return NextResponse.json(
      { error: 'Failed to create bus booking' },
      { status: 500 }
    );
  }
}
