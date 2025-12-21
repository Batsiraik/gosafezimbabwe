import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/services/requests/create - Create a new service request
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
    const { serviceId, jobDescription, budget, location } = body;

    // Validate required fields
    if (!serviceId || !jobDescription || !budget || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate service exists and is active
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || !service.isActive) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      );
    }

    // Validate budget is a positive number
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid budget amount' },
        { status: 400 }
      );
    }

    // Check if user already has an active service request
    const existingRequest = await prisma.serviceRequest.findFirst({
      where: {
        userId: decoded.userId,
        status: {
          in: ['pending', 'searching', 'accepted', 'in_progress'],
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { 
          error: 'You already have an active service request. Please wait for it to be completed or cancelled before creating a new one.',
          existingRequestId: existingRequest.id
        },
        { status: 400 }
      );
    }

    // Create the service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        userId: decoded.userId,
        serviceId,
        jobDescription,
        budget: budgetNum,
        location,
        status: 'searching', // Start with searching status (will change to bid_received when providers bid)
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
      },
    });

    return NextResponse.json({
      message: 'Service request created successfully',
      request: serviceRequest,
    });
  } catch (error) {
    console.error('Error creating service request:', error);
    return NextResponse.json(
      { error: 'Failed to create service request' },
      { status: 500 }
    );
  }
}
