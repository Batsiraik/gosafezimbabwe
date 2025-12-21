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

    // Check if user is verified
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isVerified: true },
    });

    if (!user || !user.isVerified) {
      return NextResponse.json(
        { error: 'Identity verification required. Please verify your identity in settings before using this service.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userType,
      fromCityId,
      toCityId,
      travelDate,
      pricePerPassenger,
      willingToPay,
      numberOfSeats,
      maxBags,
      neededSeats,
      userBags,
      note,
    } = body;

    // Validate required fields
    if (!userType || !fromCityId || !toCityId || !travelDate) {
      return NextResponse.json(
        { error: 'All required fields are missing' },
        { status: 400 }
      );
    }

    // Validate price based on user type
    if (userType === 'has-car' && pricePerPassenger === undefined) {
      return NextResponse.json(
        { error: 'Price per passenger is required for drivers' },
        { status: 400 }
      );
    }

    if (userType === 'needs-car' && willingToPay === undefined) {
      return NextResponse.json(
        { error: 'Willing to pay amount is required for passengers' },
        { status: 400 }
      );
    }

    // Validate userType
    if (userType !== 'has-car' && userType !== 'needs-car') {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const travelDateObj = new Date(travelDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (travelDateObj < today) {
      return NextResponse.json(
        { error: 'Travel date cannot be in the past' },
        { status: 400 }
      );
    }

    // Check if user already has an active request (searching or matched, not completed)
    const existingRequest = await prisma.cityToCityRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: {
          in: ['searching', 'matched'], // Only check for active requests, not completed ones
        },
        travelDate: {
          gte: today,
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: 'You already have an active city-to-city request. Please cancel your current request before creating a new one.',
          existingRequestId: existingRequest.id
        },
        { status: 400 }
      );
    }

    // Create city-to-city request
    const cityToCityRequest = await prisma.cityToCityRequest.create({
      data: {
        userId: decoded.userId,
        userType,
        fromCityId,
        toCityId,
        travelDate: travelDateObj,
        pricePerPassenger: userType === 'has-car' ? pricePerPassenger : null,
        willingToPay: userType === 'needs-car' ? willingToPay : null,
        numberOfSeats: userType === 'has-car' ? numberOfSeats : null,
        maxBags: userType === 'has-car' ? maxBags : null,
        neededSeats: userType === 'needs-car' ? neededSeats : null,
        userBags: userType === 'needs-car' ? userBags : null,
        note: note || null,
        status: 'searching',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'City-to-city request created successfully',
        request: {
          id: cityToCityRequest.id,
          userType: cityToCityRequest.userType,
          fromCityId: cityToCityRequest.fromCityId,
          toCityId: cityToCityRequest.toCityId,
          travelDate: cityToCityRequest.travelDate,
          pricePerPassenger: cityToCityRequest.pricePerPassenger,
          willingToPay: cityToCityRequest.willingToPay,
          status: cityToCityRequest.status,
          createdAt: cityToCityRequest.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create city-to-city request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
