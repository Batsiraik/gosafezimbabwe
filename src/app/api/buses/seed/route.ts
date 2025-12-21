import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/buses/seed - Seed initial bus schedules for Harare to Bulawayo
export async function POST() {
  try {
    // Find Harare and Bulawayo cities
    const harare = await prisma.city.findFirst({
      where: { name: { contains: 'Harare', mode: 'insensitive' } },
    });
    const bulawayo = await prisma.city.findFirst({
      where: { name: { contains: 'Bulawayo', mode: 'insensitive' } },
    });

    if (!harare || !bulawayo) {
      return NextResponse.json(
        { error: 'Harare or Bulawayo cities not found. Please seed cities first.' },
        { status: 404 }
      );
    }

    // Example bus schedules for Harare to Bulawayo
    const schedules = [
      {
        fromCityId: harare.id,
        toCityId: bulawayo.id,
        departureTime: '06:00',
        arrivalTime: '12:00',
        station: 'Harare Central Bus Station',
        price: 25.00,
        totalSeats: 50,
        availableSeats: 50,
        conductorPhone: '+263776954448', // Example phone number
        daysOfWeek: 'daily',
      },
      {
        fromCityId: harare.id,
        toCityId: bulawayo.id,
        departureTime: '09:00',
        arrivalTime: '15:00',
        station: 'Harare Central Bus Station',
        price: 25.00,
        totalSeats: 50,
        availableSeats: 50,
        conductorPhone: '+263776954449',
        daysOfWeek: 'daily',
      },
      {
        fromCityId: harare.id,
        toCityId: bulawayo.id,
        departureTime: '12:00',
        arrivalTime: '18:00',
        station: 'Harare Downtown Terminal',
        price: 28.00,
        totalSeats: 45,
        availableSeats: 45,
        conductorPhone: '+263776954450',
        daysOfWeek: 'daily',
      },
      {
        fromCityId: harare.id,
        toCityId: bulawayo.id,
        departureTime: '15:00',
        arrivalTime: '21:00',
        station: 'Harare Central Bus Station',
        price: 30.00,
        totalSeats: 50,
        availableSeats: 50,
        conductorPhone: '+263776954451',
        daysOfWeek: 'daily',
      },
      {
        fromCityId: harare.id,
        toCityId: bulawayo.id,
        departureTime: '18:00',
        arrivalTime: '00:00',
        station: 'Harare North Station',
        price: 32.00,
        totalSeats: 40,
        availableSeats: 40,
        conductorPhone: '+263776954452',
        daysOfWeek: 'daily',
      },
      {
        fromCityId: harare.id,
        toCityId: bulawayo.id,
        departureTime: '21:00',
        arrivalTime: '03:00',
        station: 'Harare Central Bus Station',
        price: 35.00,
        totalSeats: 50,
        availableSeats: 50,
        conductorPhone: '+263776954453',
        daysOfWeek: 'daily',
      },
    ];

    // Check for existing schedules and create new ones
    const createdSchedules = [];
    for (const schedule of schedules) {
      try {
        // Check if schedule already exists
        const existing = await prisma.busSchedule.findFirst({
          where: {
            fromCityId: schedule.fromCityId,
            toCityId: schedule.toCityId,
            departureTime: schedule.departureTime,
            station: schedule.station,
          },
        });

        if (existing) {
          // Update existing schedule
          const updated = await prisma.busSchedule.update({
            where: { id: existing.id },
            data: {
              price: schedule.price,
              totalSeats: schedule.totalSeats,
              availableSeats: schedule.availableSeats,
              isActive: true,
            },
          });
          createdSchedules.push(updated);
        } else {
          // Create new schedule
          const created = await prisma.busSchedule.create({
            data: schedule,
          });
          createdSchedules.push(created);
        }
      } catch (error) {
        console.error('Error creating/updating schedule:', error);
        // Continue with next schedule
      }
    }

    return NextResponse.json({
      message: 'Bus schedules seeded successfully',
      count: createdSchedules.length,
      schedules: createdSchedules,
    });
  } catch (error) {
    console.error('Error seeding bus schedules:', error);
    return NextResponse.json(
      { error: 'Failed to seed bus schedules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
