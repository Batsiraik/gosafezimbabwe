import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/bus/schedules - Get all schedules for this bus provider
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      schedules,
      count: schedules.length,
    });
  } catch (error) {
    console.error('Error fetching bus schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

// POST /api/driver/bus/schedules - Create a new bus schedule
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

    if (!provider.isVerified) {
      return NextResponse.json(
        { error: 'Provider must be verified to create schedules' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fromCityId, toCityId, departureTime, arrivalTime, station, price, totalSeats, conductorPhone, daysOfWeek } = body;

    // Validation
    if (!fromCityId || !toCityId || !departureTime || !station || !price || !totalSeats) {
      return NextResponse.json(
        { error: 'Missing required fields: fromCityId, toCityId, departureTime, station, price, totalSeats' },
        { status: 400 }
      );
    }

    if (fromCityId === toCityId) {
      return NextResponse.json(
        { error: 'From and to cities must be different' },
        { status: 400 }
      );
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      );
    }

    if (totalSeats < 1) {
      return NextResponse.json(
        { error: 'Total seats must be at least 1' },
        { status: 400 }
      );
    }

    // Validate daysOfWeek
    if (!daysOfWeek || (typeof daysOfWeek === 'string' && daysOfWeek.trim() === '')) {
      return NextResponse.json(
        { error: 'Please select at least one operating day' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(departureTime)) {
      return NextResponse.json(
        { error: 'Invalid departure time format. Use HH:MM (e.g., 09:00)' },
        { status: 400 }
      );
    }

    if (arrivalTime && !timeRegex.test(arrivalTime)) {
      return NextResponse.json(
        { error: 'Invalid arrival time format. Use HH:MM (e.g., 14:30)' },
        { status: 400 }
      );
    }

    // Verify cities exist
    const fromCity = await prisma.city.findUnique({ where: { id: fromCityId } });
    const toCity = await prisma.city.findUnique({ where: { id: toCityId } });

    if (!fromCity || !toCity) {
      return NextResponse.json(
        { error: 'Invalid city selected' },
        { status: 400 }
      );
    }

    // Create the schedule
    const schedule = await prisma.busSchedule.create({
      data: {
        busProviderId: provider.id,
        fromCityId,
        toCityId,
        departureTime,
        arrivalTime: arrivalTime || null,
        station,
        price,
        totalSeats,
        availableSeats: totalSeats, // Initially all seats are available
        conductorPhone: conductorPhone || null,
        isActive: true,
        daysOfWeek: daysOfWeek || 'daily', // Store as comma-separated string or 'daily'
      },
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
    });

    return NextResponse.json({
      message: 'Bus schedule created successfully',
      schedule,
    });
  } catch (error: any) {
    console.error('Error creating bus schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create schedule',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
