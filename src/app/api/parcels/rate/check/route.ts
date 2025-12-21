import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/parcels/rate/check?parcelId=xxx - Check if user has already rated this parcel
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const parcelId = searchParams.get('parcelId');

    if (!parcelId) {
      return NextResponse.json(
        { error: 'Parcel ID is required' },
        { status: 400 }
      );
    }

    // Get the parcel to find the other party
    const parcel = await prisma.parcelRequest.findUnique({
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

    // Determine who the user is rating (the other party)
    const isPassenger = parcel.userId === decoded.userId;
    const rateeId = isPassenger 
      ? parcel.driver?.user.id 
      : parcel.userId;

    if (!rateeId) {
      return NextResponse.json({ hasRated: false });
    }

    // Check if rating exists
    const existingRating = await prisma.rating.findFirst({
      where: {
        parcelRequestId: parcelId,
        raterId: decoded.userId,
        rateeId: rateeId,
      },
    });

    return NextResponse.json({
      hasRated: !!existingRating,
    });
  } catch (error) {
    console.error('Error checking rating:', error);
    return NextResponse.json(
      { error: 'Failed to check rating' },
      { status: 500 }
    );
  }
}
