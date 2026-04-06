import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [schedules, total] = await Promise.all([
      prisma.busSchedule.findMany({
        skip,
        take: limit,
        include: {
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
          fromCity: true,
          toCity: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.busSchedule.count(),
    ]);

    return NextResponse.json({
      schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bus schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch bus schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: { adminId?: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { adminId?: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      busProviderId,
      fromCityId,
      toCityId,
      departureTime,
      arrivalTime,
      station,
      price,
      totalSeats,
      daysOfWeek,
      conductorPhone,
      isActive,
    } = body;

    if (!busProviderId || typeof busProviderId !== 'string') {
      return NextResponse.json({ error: 'Verified bus provider is required' }, { status: 400 });
    }

    const provider = await prisma.busProvider.findUnique({
      where: { id: busProviderId },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Bus provider not found' }, { status: 404 });
    }

    if (!provider.isVerified) {
      return NextResponse.json(
        { error: 'Only verified bus providers can be assigned a schedule' },
        { status: 403 }
      );
    }

    if (!fromCityId || !toCityId || !departureTime || !station || price == null || !totalSeats) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: busProviderId, fromCityId, toCityId, departureTime, station, price, totalSeats',
        },
        { status: 400 }
      );
    }

    if (fromCityId === toCityId) {
      return NextResponse.json({ error: 'From and to cities must be different' }, { status: 400 });
    }

    if (Number(price) <= 0) {
      return NextResponse.json({ error: 'Price must be greater than 0' }, { status: 400 });
    }

    if (Number(totalSeats) < 1) {
      return NextResponse.json({ error: 'Total seats must be at least 1' }, { status: 400 });
    }

    const dow =
      typeof daysOfWeek === 'string' && daysOfWeek.trim() !== '' ? daysOfWeek.trim() : 'daily';

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(String(departureTime))) {
      return NextResponse.json(
        { error: 'Invalid departure time. Use HH:MM (e.g. 09:00)' },
        { status: 400 }
      );
    }

    if (arrivalTime && !timeRegex.test(String(arrivalTime))) {
      return NextResponse.json(
        { error: 'Invalid arrival time. Use HH:MM (e.g. 14:30)' },
        { status: 400 }
      );
    }

    const [fromCity, toCity] = await Promise.all([
      prisma.city.findUnique({ where: { id: fromCityId } }),
      prisma.city.findUnique({ where: { id: toCityId } }),
    ]);

    if (!fromCity || !toCity) {
      return NextResponse.json({ error: 'Invalid city selected' }, { status: 400 });
    }

    const schedule = await prisma.busSchedule.create({
      data: {
        busProviderId: provider.id,
        fromCityId,
        toCityId,
        departureTime: String(departureTime),
        arrivalTime: arrivalTime ? String(arrivalTime) : null,
        station: String(station).trim(),
        price: Number(price),
        totalSeats: Number(totalSeats),
        availableSeats: Number(totalSeats),
        conductorPhone: conductorPhone ? String(conductorPhone).trim() : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        daysOfWeek: dow,
      },
      include: {
        busProvider: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
          },
        },
        fromCity: true,
        toCity: true,
      },
    });

    return NextResponse.json({ message: 'Bus schedule created', schedule });
  } catch (error) {
    console.error('Error creating bus schedule (admin):', error);
    return NextResponse.json({ error: 'Failed to create bus schedule' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId, busStation, ...rest } = await request.json();

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...rest };
    if (busStation !== undefined) {
      data.station = busStation;
      delete (data as { busStation?: string }).busStation;
    }

    const allowed = ['departureTime', 'arrivalTime', 'station', 'price', 'totalSeats', 'daysOfWeek', 'isActive', 'conductorPhone', 'availableSeats'];
    const filtered: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) filtered[key] = data[key];
    }

    await prisma.busSchedule.update({
      where: { id: scheduleId },
      data: filtered,
    });

    return NextResponse.json({ message: 'Bus schedule updated successfully' });
  } catch (error) {
    console.error('Error updating bus schedule:', error);
    return NextResponse.json({ error: 'Failed to update bus schedule' }, { status: 500 });
  }
}
