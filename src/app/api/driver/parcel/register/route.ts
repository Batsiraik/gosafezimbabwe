import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Increase timeout for large image uploads (Vercel Pro allows up to 800 seconds)
export const maxDuration = 60; // 60 seconds should be enough for image processing

// POST /api/driver/parcel/register - Register as parcel delivery driver
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
    const { licenseNumber, licenseUrl, bikeRegistration, bikePictureUrl } = body;

    // Validation
    if (!licenseNumber || !licenseUrl || !bikeRegistration || !bikePictureUrl) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if driver profile already exists
    const existingDriver = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });

    if (existingDriver) {
      // Update existing driver profile for parcel service
      if (existingDriver.serviceType !== 'parcel') {
        // If they're a driver, create a separate parcel driver profile
        // Actually, we can allow multiple service types by updating serviceType
        // For now, let's update it to support both or create separate
        // Let's update the existing one to parcel if they want to switch
        const updatedDriver = await prisma.driver.update({
          where: { id: existingDriver.id },
          data: {
            serviceType: 'parcel',
            licenseNumber,
            licenseUrl,
            carRegistration: bikeRegistration, // Using carRegistration field for bike registration
            carPictureUrl: bikePictureUrl, // Using carPictureUrl for bike picture
            isVerified: false, // Reset verification when updating
          },
        });

        return NextResponse.json({
          message: 'Parcel driver profile updated successfully',
          driver: updatedDriver,
        });
      } else {
        // Update existing parcel driver
        const updatedDriver = await prisma.driver.update({
          where: { id: existingDriver.id },
          data: {
            licenseNumber,
            licenseUrl,
            carRegistration: bikeRegistration,
            carPictureUrl: bikePictureUrl,
            isVerified: false, // Reset verification when updating
          },
        });

        return NextResponse.json({
          message: 'Parcel driver profile updated successfully',
          driver: updatedDriver,
        });
      }
    } else {
      // Create new driver profile
      const newDriver = await prisma.driver.create({
        data: {
          userId: decoded.userId,
          serviceType: 'parcel',
          licenseNumber,
          licenseUrl,
          carRegistration: bikeRegistration, // Using carRegistration field for bike registration
          carPictureUrl: bikePictureUrl, // Using carPictureUrl for bike picture
          isVerified: false, // Admin will verify
        },
      });

      return NextResponse.json({
        message: 'Parcel driver registration submitted successfully',
        driver: newDriver,
      });
    }
  } catch (error: any) {
    console.error('Parcel driver registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register parcel driver' },
      { status: 500 }
    );
  }
}
