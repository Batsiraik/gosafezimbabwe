import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { notifyCityToCityMatch } from '@/lib/notifications';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { matchRequestId } = body;

    if (!matchRequestId) {
      return NextResponse.json(
        { error: 'Match request ID is required' },
        { status: 400 }
      );
    }

    // Get user's active request
    const userRequest = await prisma.cityToCityRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: 'searching',
      },
    });

    if (!userRequest) {
      return NextResponse.json(
        { error: 'You do not have an active request' },
        { status: 400 }
      );
    }

    // Only users with car (has-car) can initiate matches
    // Users without car (needs-car) can only see who matched with them
    if (userRequest.userType !== 'has-car') {
      return NextResponse.json(
        { error: 'Only drivers can accept matches. Passengers will be notified when a driver matches with them.' },
        { status: 403 }
      );
    }

    // Get the match request with cities
    const matchRequest = await prisma.cityToCityRequest.findUnique({
      where: { id: matchRequestId },
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
            name: true,
          },
        },
        toCity: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!matchRequest) {
      return NextResponse.json(
        { error: 'Match request not found' },
        { status: 404 }
      );
    }

    if (matchRequest.status !== 'searching') {
      return NextResponse.json(
        { error: 'Match request is no longer available' },
        { status: 400 }
      );
    }

    // Verify they can match (opposite types, same route)
    if (matchRequest.userType === userRequest.userType) {
      return NextResponse.json(
        { error: 'Cannot match with same user type' },
        { status: 400 }
      );
    }

    if (matchRequest.fromCityId !== userRequest.fromCityId || matchRequest.toCityId !== userRequest.toCityId) {
      return NextResponse.json(
        { error: 'Routes do not match' },
        { status: 400 }
      );
    }

    // Check if driver already has enough passengers (for drivers matching multiple passengers)
    if (userRequest.userType === 'has-car' && userRequest.numberOfSeats) {
      const existingMatches = await prisma.cityToCityMatch.count({
        where: {
          driverRequestId: userRequest.id,
          status: 'active',
        },
      });

      if (existingMatches >= userRequest.numberOfSeats) {
        return NextResponse.json(
          { error: 'Driver already has enough passengers' },
          { status: 400 }
        );
      }
    }

    // Create match record (allows multiple matches for drivers)
    // Since userRequest.userType is 'has-car' (checked above), userRequest is the driver
    const match = await prisma.cityToCityMatch.create({
      data: {
        driverRequestId: userRequest.id, // userRequest is the driver
        passengerRequestId: matchRequest.id, // matchRequest is the passenger
        status: 'active',
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
          },
        },
        passengerRequest: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    // Update passenger request to matched status (only one match per passenger)
    // Note: Since only 'has-car' users can initiate matches, we update the passenger's request
    await prisma.cityToCityRequest.update({
      where: { id: matchRequest.id }, // Update the passenger's request (matchRequest is the passenger)
      data: { status: 'matched' },
    });

    // Update driver request to matched if they got all their passengers
    if (userRequest.numberOfSeats) {
      const totalMatches = await prisma.cityToCityMatch.count({
        where: {
          driverRequestId: userRequest.id,
          status: 'active',
        },
      });

      if (totalMatches >= userRequest.numberOfSeats) {
        await prisma.cityToCityRequest.update({
          where: { id: userRequest.id },
          data: { status: 'matched' },
        });
      }
    }

    // Since userRequest.userType is 'has-car' (checked above), we know:
    // - userRequest is the driver
    // - matchRequest is the passenger
    // - match.passengerRequest is the passenger's request
    // - match.driverRequest is the driver's request

    // Notify passenger that they have a match (async, don't wait)
    if (matchRequest.fromCity && matchRequest.toCity) {
      notifyCityToCityMatch(
        matchRequest.user.id,
        match.driverRequest.user.fullName,
        matchRequest.fromCity.name,
        matchRequest.toCity.name
      ).catch((error) => {
        console.error('Error sending city-to-city match notification:', error);
      });
    }

    return NextResponse.json(
      {
        message: 'Successfully matched!',
        match: {
          id: match.id,
          user: match.passengerRequest.user, // The passenger who was matched
          travelDate: match.passengerRequest.travelDate,
          pricePerPassenger: userRequest.pricePerPassenger, // Driver's price per passenger
          willingToPay: match.passengerRequest.willingToPay, // Passenger's willing to pay
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Match request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
