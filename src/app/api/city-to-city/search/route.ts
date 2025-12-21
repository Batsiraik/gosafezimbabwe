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

    // Get user's active request
    const userRequest = await prisma.cityToCityRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: 'searching',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!userRequest) {
      return NextResponse.json(
        { matches: [], suggestions: [], message: 'No active request found' },
        { status: 200 }
      );
    }

    // Check if travel date has passed (expire if so)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const travelDate = new Date(userRequest.travelDate);
    travelDate.setHours(0, 0, 0, 0);

    if (travelDate < today) {
      // Expire the request
      await prisma.cityToCityRequest.update({
        where: { id: userRequest.id },
        data: { status: 'expired' },
      });

      return NextResponse.json(
        { matches: [], suggestions: [], message: 'Your request has expired', expired: true },
        { status: 200 }
      );
    }

    // If user is a driver, get already matched passenger IDs to exclude them
    let excludePassengerIds: string[] = [];
    if (userRequest.userType === 'has-car') {
      const existingMatches = await prisma.cityToCityMatch.findMany({
        where: {
          driverRequestId: userRequest.id,
          status: 'active',
        },
        select: {
          passengerRequestId: true,
        },
      });
      excludePassengerIds = existingMatches.map(m => m.passengerRequestId);
    }

    // Build date range for matching (same day, ignore time)
    const travelDateStart = new Date(travelDate);
    travelDateStart.setHours(0, 0, 0, 0);
    const travelDateEnd = new Date(travelDate);
    travelDateEnd.setHours(23, 59, 59, 999);

    // Build where clause - match by route only (same from/to cities), opposite user type, same date
    // Price negotiation happens between users after matching, so we don't filter by price here
    const whereClause: any = {
      userId: { not: decoded.userId }, // Not the same user
      fromCityId: userRequest.fromCityId, // Same origin city
      toCityId: userRequest.toCityId, // Same destination city
      travelDate: {
        gte: travelDateStart, // Same day (start of day)
        lte: travelDateEnd, // Same day (end of day)
      },
      userType: userRequest.userType === 'has-car' ? 'needs-car' : 'has-car', // Opposite user type
      status: 'searching', // Must be actively searching
    };

    // Exclude already matched passengers for drivers
    if (excludePassengerIds.length > 0) {
      whereClause.id = {
        not: userRequest.id,
        notIn: excludePassengerIds,
      };
    } else {
      // Ensure we exclude the user's own request
      whereClause.id = { not: userRequest.id };
    }

    // Find exact matches (same date, opposite user type, same route)
    // Matching is based on: same from/to cities, same travel date, opposite user type
    // Price negotiation happens between users after matching
    const exactMatches = await prisma.cityToCityRequest.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('City-to-City Matching Debug:', {
        userRequest: {
          id: userRequest.id,
          userId: userRequest.userId,
          userType: userRequest.userType,
          fromCityId: userRequest.fromCityId,
          toCityId: userRequest.toCityId,
          travelDate: userRequest.travelDate,
          status: userRequest.status,
        },
        whereClause,
        matchesFound: exactMatches.length,
      });
    }

    // Find suggestions (24 hours difference, only for needs-car users)
    let suggestions: any[] = [];
    if (userRequest.userType === 'needs-car') {
      const dayBefore = new Date(travelDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      const dayAfter = new Date(travelDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Build date ranges for day before and day after
      const dayBeforeStart = new Date(dayBefore);
      dayBeforeStart.setHours(0, 0, 0, 0);
      const dayBeforeEnd = new Date(dayBefore);
      dayBeforeEnd.setHours(23, 59, 59, 999);
      
      const dayAfterStart = new Date(dayAfter);
      dayAfterStart.setHours(0, 0, 0, 0);
      const dayAfterEnd = new Date(dayAfter);
      dayAfterEnd.setHours(23, 59, 59, 999);

      const suggestionRequests = await prisma.cityToCityRequest.findMany({
        where: {
          id: { not: userRequest.id },
          userId: { not: decoded.userId },
          fromCityId: userRequest.fromCityId,
          toCityId: userRequest.toCityId,
          travelDate: {
            OR: [
              {
                gte: dayBeforeStart,
                lte: dayBeforeEnd,
              },
              {
                gte: dayAfterStart,
                lte: dayAfterEnd,
              },
            ],
          },
          userType: 'has-car',
          status: 'searching',
        },
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      suggestions = suggestionRequests.map(req => ({
        id: req.id,
        travelDate: req.travelDate,
        pricePerPassenger: req.pricePerPassenger,
        numberOfSeats: req.numberOfSeats,
        maxBags: req.maxBags,
        user: req.user,
        fromCity: req.fromCity,
        toCity: req.toCity,
        dateDifference: Math.abs(
          Math.floor((new Date(req.travelDate).getTime() - travelDate.getTime()) / (1000 * 60 * 60 * 24))
        ),
      }));
    }

    // Format matches
    const formattedMatches = exactMatches.map(match => ({
      id: match.id,
      travelDate: match.travelDate,
      pricePerPassenger: match.pricePerPassenger,
      willingToPay: match.willingToPay,
      numberOfSeats: match.numberOfSeats,
      maxBags: match.maxBags,
      neededSeats: match.neededSeats,
      userBags: match.userBags,
      note: match.note,
      user: match.user,
      fromCity: match.fromCity,
      toCity: match.toCity,
    }));

    return NextResponse.json(
      {
        matches: formattedMatches,
        suggestions,
        userRequest: {
          id: userRequest.id,
          userType: userRequest.userType,
          fromCityId: userRequest.fromCityId,
          toCityId: userRequest.toCityId,
          travelDate: userRequest.travelDate,
          pricePerPassenger: userRequest.pricePerPassenger,
          willingToPay: userRequest.willingToPay,
          numberOfSeats: userRequest.numberOfSeats,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Search matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
