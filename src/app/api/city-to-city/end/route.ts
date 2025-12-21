import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST endpoint to end/complete a city-to-city match
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
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Get the match
    const match = await prisma.cityToCityMatch.findUnique({
      where: { id: matchId },
      include: {
        driverRequest: {
          include: {
            user: true,
          },
        },
        passengerRequest: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Verify user is part of this match (either driver or passenger)
    const isDriver = match.driverRequest.userId === decoded.userId;
    const isPassenger = match.passengerRequest.userId === decoded.userId;

    if (!isDriver && !isPassenger) {
      return NextResponse.json(
        { error: 'Unauthorized to end this match' },
        { status: 403 }
      );
    }

    // Check if match is already completed or cancelled
    if (match.status !== 'active') {
      return NextResponse.json(
        { error: 'Match is already completed or cancelled' },
        { status: 400 }
      );
    }

    // Update match status to completed
    const updatedMatch = await prisma.cityToCityMatch.update({
      where: { id: matchId },
      data: { status: 'completed' },
    });

    // Update both requests to completed status if all their matches are completed
    // For driver: check if all matches for this driver request are completed
    const driverMatches = await prisma.cityToCityMatch.findMany({
      where: {
        driverRequestId: match.driverRequestId,
        status: 'active',
      },
    });

    if (driverMatches.length === 0) {
      // All matches for this driver are completed, update driver request to completed
      await prisma.cityToCityRequest.update({
        where: { id: match.driverRequestId },
        data: { status: 'completed' },
      });
    }

    // For passenger: check if all matches for this passenger are completed
    const passengerMatches = await prisma.cityToCityMatch.findMany({
      where: {
        passengerRequestId: match.passengerRequestId,
        status: 'active',
      },
    });

    if (passengerMatches.length === 0) {
      // All matches for this passenger are completed, update passenger request to completed
      await prisma.cityToCityRequest.update({
        where: { id: match.passengerRequestId },
        data: { status: 'completed' },
      });
    }
    
    // Return information about whether requests were completed
    return NextResponse.json(
      {
        message: 'Ride share completed successfully',
        match: updatedMatch,
        driverRequestCompleted: driverMatches.length === 0,
        passengerRequestCompleted: passengerMatches.length === 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('End city-to-city match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

