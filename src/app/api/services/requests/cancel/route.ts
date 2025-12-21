import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/services/requests/cancel - Cancel a service request
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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Verify the request belongs to the user
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    if (serviceRequest.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if request can be cancelled
    if (serviceRequest.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed request' },
        { status: 400 }
      );
    }

    if (serviceRequest.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Request is already cancelled' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: 'cancelled',
      },
      include: {
        service: true,
      },
    });

    return NextResponse.json({
      message: 'Service request cancelled successfully',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error cancelling service request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel service request' },
      { status: 500 }
    );
  }
}
