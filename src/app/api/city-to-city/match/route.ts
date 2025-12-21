import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

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

    // Get the match request
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
    const match = await prisma.cityToCityMatch.create({
      data: {
        driverRequestId: userRequest.userType === 'has-car' ? userRequest.id : matchRequest.id,
        passengerRequestId: userRequest.userType === 'has-car' ? matchRequest.id : userRequest.id,
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
    if (userRequest.userType === 'needs-car') {
      await prisma.cityToCityRequest.update({
        where: { id: userRequest.id },
        data: { status: 'matched' },
      });
    }

    // Update driver request to matched if they got all their passengers
    if (userRequest.userType === 'has-car' && userRequest.numberOfSeats) {
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

    const matchedUser = userRequest.userType === 'has-car' 
      ? match.passengerRequest.user 
      : match.driverRequest.user;

    return NextResponse.json(
      {
        message: 'Successfully matched!',
        match: {
          id: match.id,
          user: matchedUser,
          travelDate: userRequest.userType === 'has-car' 
            ? match.passengerRequest.travelDate 
            : match.driverRequest.travelDate,
          pricePerPassenger: userRequest.userType === 'has-car' 
            ? userRequest.pricePerPassenger 
            : match.driverRequest.pricePerPassenger,
          willingToPay: userRequest.userType === 'needs-car' 
            ? userRequest.willingToPay 
            : match.passengerRequest.willingToPay,
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
