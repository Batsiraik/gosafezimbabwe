import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/rides/rate - Submit a rating and review
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { rideId, parcelId, serviceRequestId, rateeId, raterType, rateeType, rating, review } = body;

    // Validation
    if ((!rideId && !parcelId && !serviceRequestId) || !rateeId || !raterType || !rateeType || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure only one request type is provided
    const requestTypes = [rideId, parcelId, serviceRequestId].filter(Boolean);
    if (requestTypes.length > 1) {
      return NextResponse.json(
        { error: 'Can only rate one request type at a time' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (decoded.userId === rateeId) {
      return NextResponse.json(
        { error: 'Cannot rate yourself' },
        { status: 400 }
      );
    }

    // Verify the ride, parcel, or service request exists and user is part of it
    let ride = null;
    let parcel = null;
    let serviceRequest = null;
    let isPassenger = false;
    let isDriver = false;
    let isCustomer = false;
    let isProvider = false;
    let expectedRateeId: string | null = null;

    if (rideId) {
      ride = await prisma.rideRequest.findUnique({
        where: { id: rideId },
        include: {
          user: true,
          driver: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!ride) {
        return NextResponse.json(
          { error: 'Ride not found' },
          { status: 404 }
        );
      }

      isPassenger = ride.userId === decoded.userId;
      isDriver = ride.driverId && ride.driver?.userId === decoded.userId;

      if (!isPassenger && !isDriver) {
        return NextResponse.json(
          { error: 'Unauthorized to rate this ride' },
          { status: 403 }
        );
      }

      expectedRateeId = isPassenger ? ride.driver?.user.id || null : ride.userId;
    } else if (parcelId) {
      parcel = await prisma.parcelRequest.findUnique({
        where: { id: parcelId },
        include: {
          user: true,
          driver: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!parcel) {
        return NextResponse.json(
          { error: 'Parcel not found' },
          { status: 404 }
        );
      }

      isPassenger = parcel.userId === decoded.userId;
      isDriver = parcel.driverId && parcel.driver?.userId === decoded.userId;

      if (!isPassenger && !isDriver) {
        return NextResponse.json(
          { error: 'Unauthorized to rate this parcel' },
          { status: 403 }
        );
      }

      expectedRateeId = isPassenger ? parcel.driver?.user.id || null : parcel.userId;
    } else if (serviceRequestId) {
      serviceRequest = await prisma.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        include: {
          user: true,
          provider: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!serviceRequest) {
        return NextResponse.json(
          { error: 'Service request not found' },
          { status: 404 }
        );
      }

      isCustomer = serviceRequest.userId === decoded.userId;
      isProvider = serviceRequest.providerId && serviceRequest.provider?.userId === decoded.userId;

      if (!isCustomer && !isProvider) {
        return NextResponse.json(
          { error: 'Unauthorized to rate this service request' },
          { status: 403 }
        );
      }

      expectedRateeId = isCustomer ? serviceRequest.provider?.user.id || null : serviceRequest.userId;
    }

    if (rateeId !== expectedRateeId) {
      return NextResponse.json(
        { error: `Invalid ratee for this ${rideId ? 'ride' : parcelId ? 'parcel' : 'service request'}` },
        { status: 400 }
      );
    }

    // Check if rating already exists
    const existingRating = rideId
      ? await prisma.rating.findFirst({
          where: {
            rideRequestId: rideId,
            raterId: decoded.userId,
            rateeId: rateeId,
          },
        })
      : parcelId
      ? await prisma.rating.findFirst({
          where: {
            parcelRequestId: parcelId,
            raterId: decoded.userId,
            rateeId: rateeId,
          },
        })
      : await prisma.rating.findFirst({
          where: {
            serviceRequestId: serviceRequestId,
            raterId: decoded.userId,
            rateeId: rateeId,
          },
        });

    if (existingRating) {
      // Update existing rating
      const updatedRating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: {
          rating,
          review: review || null,
        },
      });

      return NextResponse.json({
        message: 'Rating updated successfully',
        rating: updatedRating,
      });
    } else {
      // Create new rating
      const newRating = await prisma.rating.create({
        data: {
          rideRequestId: rideId || null,
          parcelRequestId: parcelId || null,
          serviceRequestId: serviceRequestId || null,
          raterId: decoded.userId,
          rateeId: rateeId,
          raterType: raterType,
          rateeType: rateeType,
          rating,
          review: review || null,
        },
      });

      return NextResponse.json({
        message: 'Rating submitted successfully',
        rating: newRating,
      });
    }
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Rating already exists for this ride' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

// GET /api/rides/rate?userId=xxx - Get average rating for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get all ratings received by this user
    const ratings = await prisma.rating.findMany({
      where: { rateeId: userId },
      select: { rating: true },
    });

    if (ratings.length === 0) {
      return NextResponse.json({
        averageRating: 0,
        totalRatings: 0,
      });
    }

    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / ratings.length;

    return NextResponse.json({
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: ratings.length,
    });
  } catch (error) {
    console.error('Error fetching rating:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rating' },
      { status: 500 }
    );
  }
}
