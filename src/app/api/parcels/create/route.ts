import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { notifyNewParcelRequest } from '@/lib/notifications';

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
    const {
      vehicleType,
      pickupLat,
      pickupLng,
      pickupAddress,
      deliveryLat,
      deliveryLng,
      deliveryAddress,
      distance,
      price,
    } = body;

    // Validate required fields
    if (
      !vehicleType || !pickupLat || !pickupLng || !pickupAddress ||
      !deliveryLat || !deliveryLng || !deliveryAddress ||
      distance === undefined || price === undefined
    ) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Only motorbike delivery is available
    if (vehicleType !== 'motorbike') {
      return NextResponse.json(
        { error: 'Only motorbike delivery is available' },
        { status: 400 }
      );
    }

    // Create parcel request
    const parcelRequest = await prisma.parcelRequest.create({
      data: {
        userId: decoded.userId,
        vehicleType: 'motorbike', // Always motorbike
        pickupLat,
        pickupLng,
        pickupAddress,
        deliveryLat,
        deliveryLng,
        deliveryAddress,
        distance,
        price,
        status: 'searching', // Start with searching status (will change to bid_received when drivers bid)
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

    // Notify nearby parcel drivers (async, don't wait)
    notifyNewParcelRequest(parcelRequest.id, pickupLat, pickupLng).catch((error) => {
      console.error('Error sending parcel request notifications:', error);
    });

    return NextResponse.json(
      {
        message: 'Parcel request created successfully',
        parcelRequest: {
          id: parcelRequest.id,
          vehicleType: parcelRequest.vehicleType,
          pickupAddress: parcelRequest.pickupAddress,
          deliveryAddress: parcelRequest.deliveryAddress,
          distance: parcelRequest.distance,
          price: parcelRequest.price,
          status: parcelRequest.status,
          createdAt: parcelRequest.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create parcel request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
