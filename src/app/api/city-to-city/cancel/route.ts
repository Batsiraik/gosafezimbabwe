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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Verify the request belongs to the user
    const cityRequest = await prisma.cityToCityRequest.findUnique({
      where: { id: requestId },
    });

    if (!cityRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    if (cityRequest.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Cancel the request (only if not already completed or cancelled)
    if (cityRequest.status === 'expired' || cityRequest.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Request cannot be cancelled' },
        { status: 400 }
      );
    }

    const cancelledRequest = await prisma.cityToCityRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled' },
    });

    return NextResponse.json(
      {
        message: 'Request cancelled successfully',
        request: {
          id: cancelledRequest.id,
          status: cancelledRequest.status,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cancel request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
