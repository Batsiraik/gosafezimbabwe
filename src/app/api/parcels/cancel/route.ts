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
    const { parcelId } = body;

    if (!parcelId) {
      return NextResponse.json(
        { error: 'Parcel ID is required' },
        { status: 400 }
      );
    }

    // Verify the parcel belongs to the user
    const parcel = await prisma.parcelRequest.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: 'Parcel not found' },
        { status: 404 }
      );
    }

    if (parcel.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Cancel the parcel (only if not already completed or cancelled)
    if (parcel.status === 'completed' || parcel.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Parcel cannot be cancelled' },
        { status: 400 }
      );
    }

    const cancelledParcel = await prisma.parcelRequest.update({
      where: { id: parcelId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json(
      {
        message: 'Parcel cancelled successfully',
        parcelRequest: {
          id: cancelledParcel.id,
          status: cancelledParcel.status,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cancel parcel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
