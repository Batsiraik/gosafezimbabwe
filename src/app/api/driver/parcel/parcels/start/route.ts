import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/parcel/parcels/start - Start a delivery (change status to in_progress)
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
    const { parcelId } = body;

    if (!parcelId) {
      return NextResponse.json(
        { error: 'Parcel ID is required' },
        { status: 400 }
      );
    }

    // Get driver profile
    const driver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    // Get the parcel
    const parcel = await prisma.parcelRequest.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: 'Parcel not found' },
        { status: 404 }
      );
    }

    // Verify driver owns this parcel
    if (parcel.driverId !== driver.id) {
      return NextResponse.json(
        { error: 'Unauthorized to start this delivery' },
        { status: 403 }
      );
    }

    // Check if parcel is in correct status
    if (parcel.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Parcel must be accepted before starting' },
        { status: 400 }
      );
    }

    // Update parcel status to in_progress
    const updatedParcel = await prisma.parcelRequest.update({
      where: { id: parcelId },
      data: { status: 'in_progress' },
    });

    return NextResponse.json({
      message: 'Delivery started successfully',
      parcel: updatedParcel,
    });
  } catch (error) {
    console.error('Error starting delivery:', error);
    return NextResponse.json(
      { error: 'Failed to start delivery' },
      { status: 500 }
    );
  }
}
