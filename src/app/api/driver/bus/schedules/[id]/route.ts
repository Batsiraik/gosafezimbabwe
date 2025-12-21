import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// PUT /api/driver/bus/schedules/[id] - Update a bus schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: scheduleId } = await params;
    const body = await request.json();
    const { fromCityId, toCityId, departureTime, arrivalTime, station, price, totalSeats, conductorPhone, isActive, daysOfWeek } = body;

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

    // Get the schedule
    const schedule = await prisma.busSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Verify the schedule belongs to this provider
    if (schedule.busProviderId !== provider.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this schedule' },
        { status: 403 }
      );
    }

    // Validate time format if provided
    if (departureTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(departureTime)) {
        return NextResponse.json(
          { error: 'Invalid departure time format. Use HH:MM (e.g., 09:00)' },
          { status: 400 }
        );
      }
    }

    if (arrivalTime !== undefined && arrivalTime !== null) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (arrivalTime && !timeRegex.test(arrivalTime)) {
        return NextResponse.json(
          { error: 'Invalid arrival time format. Use HH:MM (e.g., 14:30)' },
          { status: 400 }
        );
      }
    }

    // Update the schedule
    const updatedSchedule = await prisma.busSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(fromCityId && { fromCityId }),
        ...(toCityId && { toCityId }),
        ...(departureTime && { departureTime }),
        ...(arrivalTime !== undefined && { arrivalTime: arrivalTime || null }),
        ...(station && { station }),
        ...(price !== undefined && { price }),
        ...(totalSeats !== undefined && { totalSeats }),
        ...(conductorPhone !== undefined && { conductorPhone: conductorPhone || null }),
        ...(isActive !== undefined && { isActive }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
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
      message: 'Schedule updated successfully',
      schedule: updatedSchedule,
    });
  } catch (error: any) {
    console.error('Error updating bus schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update schedule',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/driver/bus/schedules/[id] - Delete a bus schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: scheduleId } = await params;

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

    // Get the schedule
    const schedule = await prisma.busSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Verify the schedule belongs to this provider
    if (schedule.busProviderId !== provider.id) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this schedule' },
        { status: 403 }
      );
    }

    // Delete the schedule
    await prisma.busSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting bus schedule:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete schedule',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
