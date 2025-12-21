import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/services/requests/start - Start a service (provider marks job as in progress)
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

    // Verify the provider is the one assigned to this request
    if (!serviceRequest.provider || serviceRequest.provider.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to start this service' },
        { status: 403 }
      );
    }

    // Check if request is in accepted status
    if (serviceRequest.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Service request must be accepted before starting' },
        { status: 400 }
      );
    }

    // Update status to in_progress
    const updatedRequest = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: 'in_progress',
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
      message: 'Service started successfully',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error starting service:', error);
    return NextResponse.json(
      { error: 'Failed to start service' },
      { status: 500 }
    );
  }
}
