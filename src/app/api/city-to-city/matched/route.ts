import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET endpoint to fetch matched users for a needs-car user
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

    // Get user's active request
    const userRequest = await prisma.cityToCityRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: {
          in: ['searching', 'matched'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!userRequest) {
      return NextResponse.json(
        { matches: [], message: 'No active request found' },
        { status: 200 }
      );
    }

    // Only needs-car users can see who matched with them
    if (userRequest.userType !== 'needs-car') {
      return NextResponse.json(
        { matches: [], message: 'This endpoint is only for passengers' },
        { status: 200 }
      );
    }

    // Find all matches where this passenger request is matched (only active ones)
    const matches = await prisma.cityToCityMatch.findMany({
      where: {
        passengerRequestId: userRequest.id,
        status: 'active', // Only show active matches
      },
      include: {
        driverRequest: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                profilePictureUrl: true,
              },
            },
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format matches
    const formattedMatches = matches.map(match => ({
      id: match.id, // This is the match ID
      matchId: match.id, // Add matchId for ending the ride (same as id)
      driver: {
        id: match.driverRequest.user.id,
        fullName: match.driverRequest.user.fullName,
        phone: match.driverRequest.user.phone,
        profilePictureUrl: match.driverRequest.user.profilePictureUrl,
      },
      travelDate: match.driverRequest.travelDate,
      pricePerPassenger: match.driverRequest.pricePerPassenger,
      numberOfSeats: match.driverRequest.numberOfSeats,
      maxBags: match.driverRequest.maxBags,
      note: match.driverRequest.note,
      fromCity: match.driverRequest.fromCity,
      toCity: match.driverRequest.toCity,
      matchedAt: match.createdAt,
      status: match.status, // Include status to check if already completed
    }));

    return NextResponse.json(
      {
        matches: formattedMatches,
        userRequest: {
          id: userRequest.id,
          userType: userRequest.userType,
          fromCityId: userRequest.fromCityId,
          toCityId: userRequest.toCityId,
          travelDate: userRequest.travelDate,
          willingToPay: userRequest.willingToPay,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get matched users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
