import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as { userId: string; phone: string };

    // Get active city-to-city request (only searching or matched, not completed)
    const activeRequest = await prisma.cityToCityRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: {
          in: ['searching', 'matched'], // Only show active requests, not completed ones
        },
      },
      include: {
        fromCity: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        toCity: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        driverMatches: {
          where: { 
            status: 'active', // Only include active matches
          },
          include: {
            passengerRequest: {
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeRequest) {
      return NextResponse.json(
        { activeRequest: null },
        { status: 200 }
      );
    }

    // Check if expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const travelDate = new Date(activeRequest.travelDate);
    travelDate.setHours(0, 0, 0, 0);

    if (travelDate < today && activeRequest.status === 'searching') {
      await prisma.cityToCityRequest.update({
        where: { id: activeRequest.id },
        data: { status: 'expired' },
      });

      return NextResponse.json(
        { activeRequest: null, expired: true },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        activeRequest: {
          id: activeRequest.id,
          userType: activeRequest.userType,
          fromCityId: activeRequest.fromCityId,
          toCityId: activeRequest.toCityId,
          fromCity: activeRequest.fromCity,
          toCity: activeRequest.toCity,
          travelDate: activeRequest.travelDate,
          pricePerPassenger: activeRequest.pricePerPassenger,
          willingToPay: activeRequest.willingToPay,
          numberOfSeats: activeRequest.numberOfSeats,
          maxBags: activeRequest.maxBags,
          neededSeats: activeRequest.neededSeats,
          userBags: activeRequest.userBags,
          note: activeRequest.note,
          status: activeRequest.status,
          matchedPassengers: activeRequest.userType === 'has-car' 
            ? activeRequest.driverMatches.map(m => ({
                id: m.passengerRequest.id,
                matchId: m.id, // Add matchId for ending the ride
                user: {
                  id: m.passengerRequest.user.id,
                  fullName: m.passengerRequest.user.fullName,
                  phone: m.passengerRequest.user.phone,
                },
                travelDate: m.passengerRequest.travelDate,
                willingToPay: m.passengerRequest.willingToPay,
                neededSeats: m.passengerRequest.neededSeats,
                userBags: m.passengerRequest.userBags,
                note: m.passengerRequest.note,
                status: m.status, // Include status to check if already completed
                matchId: m.id, // Match ID for ending the ride
              }))
            : [],
          createdAt: activeRequest.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get active request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
