import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/buses/search - Search for available buses
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromCityId = searchParams.get('fromCityId');
    const toCityId = searchParams.get('toCityId');
    const travelDate = searchParams.get('travelDate');

    if (!fromCityId || !toCityId || !travelDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromCityId, toCityId, travelDate' },
        { status: 400 }
      );
    }

    // Parse the travel date
    const travelDateObj = new Date(travelDate);
    if (isNaN(travelDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid travel date format' },
        { status: 400 }
      );
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = travelDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Find bus schedules for this route from verified providers only
    // Match schedules that run "daily" or on the specific day
    const allSchedules = await prisma.busSchedule.findMany({
      where: {
        fromCityId,
        toCityId,
        isActive: true,
        busProvider: {
          isVerified: true, // Only show schedules from verified providers
        },
        OR: [
          { daysOfWeek: 'daily' },
          { daysOfWeek: { contains: dayName } },
        ],
      },
      include: {
        fromCity: true,
        toCity: true,
        busProvider: {
          select: {
            isVerified: true,
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    // Filter schedules to ensure the day matches exactly (handle comma-separated days)
    const schedules = allSchedules.filter(schedule => {
      if (schedule.daysOfWeek === 'daily') {
        return true;
      }
      const days = schedule.daysOfWeek.split(',').map(d => d.trim().toLowerCase());
      return days.includes(dayName);
    });

    // Calculate available seats for each schedule
    // (In the future, this will subtract booked seats)
    const busesWithAvailability = await Promise.all(
      schedules.map(async (schedule) => {
        // Count bookings for this schedule on this date
        const bookings = await prisma.busBooking.findMany({
          where: {
            busScheduleId: schedule.id,
            travelDate: {
              gte: new Date(travelDateObj.setHours(0, 0, 0, 0)),
              lt: new Date(travelDateObj.setHours(23, 59, 59, 999)),
            },
            status: {
              not: 'cancelled',
            },
          },
        });

        const bookedSeats = bookings.reduce((sum, booking) => sum + booking.numberOfTickets, 0);
        const availableSeats = Math.max(0, schedule.totalSeats - bookedSeats);

        return {
          id: schedule.id,
          departureTime: schedule.departureTime,
          arrivalTime: schedule.arrivalTime,
          station: schedule.station,
          price: schedule.price,
          totalSeats: schedule.totalSeats,
          availableSeats,
          conductorPhone: schedule.conductorPhone,
          fromCity: schedule.fromCity.name,
          toCity: schedule.toCity.name,
        };
      })
    );

    return NextResponse.json({
      buses: busesWithAvailability,
      count: busesWithAvailability.length,
    });
  } catch (error) {
    console.error('Error searching buses:', error);
    return NextResponse.json(
      { error: 'Failed to search buses' },
      { status: 500 }
    );
  }
}
