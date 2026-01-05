import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Increase timeout for large image uploads (Vercel Pro allows up to 800 seconds)
export const maxDuration = 60; // 60 seconds should be enough for image processing

// POST /api/driver/taxi/register - Register as driver
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

    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected application/json' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error: any) {
      console.error('JSON parse error:', error);
      // Check if error is due to payload size
      if (error?.message?.includes('too large') || error?.message?.includes('Payload')) {
        return NextResponse.json(
          { error: 'Request payload too large. Please use smaller images (under 5MB each).' },
          { status: 413 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { licenseNumber, carRegistration, licenseUrl, carPictureUrl } = body;

    // Validate required fields
    if (!licenseNumber || !carRegistration || !licenseUrl || !carPictureUrl) {
      return NextResponse.json(
        { error: 'All fields are required: licenseNumber, carRegistration, licenseUrl, carPictureUrl' },
        { status: 400 }
      );
    }

    // Check if user already has a driver profile
    const existingDriver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });

    if (existingDriver) {
      // Update existing profile
      const updatedDriver = await prisma.driver.update({
        where: { id: existingDriver.id },
        data: {
          licenseNumber,
          carRegistration: carRegistration.toUpperCase(),
          licenseUrl,
          carPictureUrl,
          isVerified: false, // Reset verification when updating
        },
      });

      return NextResponse.json({
        message: 'Driver profile updated successfully. Awaiting admin verification.',
        driver: updatedDriver,
      });
    }

    // Create new driver profile
    const driver = await prisma.driver.create({
      data: {
        userId: decoded.userId,
        serviceType: 'taxi',
        licenseNumber,
        carRegistration: carRegistration.toUpperCase(),
        licenseUrl,
        carPictureUrl,
        isVerified: false,
        isOnline: false,
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

    return NextResponse.json({
      message: 'Driver profile created successfully. Awaiting admin verification.',
      driver,
    });
  } catch (error) {
    console.error('Error registering driver:', error);
    return NextResponse.json(
      { error: 'Failed to register as driver' },
      { status: 500 }
    );
  }
}
