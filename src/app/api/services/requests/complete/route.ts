import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/services/requests/complete - Complete a service (either customer or provider can mark as done)
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

    // Get the service request
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
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

    // Verify the user is either the customer or the provider
    const isCustomer = serviceRequest.userId === decoded.userId;
    const isProvider = serviceRequest.providerId && serviceRequest.provider?.userId === decoded.userId;

    if (!isCustomer && !isProvider) {
      return NextResponse.json(
        { error: 'Unauthorized to complete this service' },
        { status: 403 }
      );
    }

    // Check if request is in accepted or in_progress status
    if (serviceRequest.status !== 'accepted' && serviceRequest.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Service request must be accepted or in progress before completing' },
        { status: 400 }
      );
    }

    // Update status to completed
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
      },
      include: {
        service: true,
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Service completed successfully',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error completing service:', error);
    return NextResponse.json(
      { error: 'Failed to complete service' },
      { status: 500 }
    );
  }
}
