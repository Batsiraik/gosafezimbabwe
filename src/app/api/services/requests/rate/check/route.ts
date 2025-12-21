import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/services/requests/rate/check?requestId=xxx - Check if user has already rated this service request
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
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Get the service request to find the other party
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
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

    // Determine who the user is rating (the other party)
    const isCustomer = serviceRequest.userId === decoded.userId;
    const rateeId = isCustomer 
      ? serviceRequest.provider?.user.id 
      : serviceRequest.userId;

    if (!rateeId) {
      return NextResponse.json({ hasRated: false });
    }

    // Check if rating exists
    const existingRating = await prisma.rating.findFirst({
      where: {
        serviceRequestId: requestId,
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
