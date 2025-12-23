import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * Check why a specific driver isn't receiving notifications
 * GET /api/notifications/check-driver?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const searchParams = request.nextUrl.searchParams;
    const checkUserId = searchParams.get('userId') || decoded.userId;

    // Get driver info
    const driver = await prisma.driver.findUnique({
      where: { userId: checkUserId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            pushToken: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({
        error: 'Driver not found',
        checks: {
          driverExists: false,
        },
      });
    }

    const checks = {
      driverExists: true,
      serviceType: driver.serviceType,
      isVerified: driver.isVerified,
      isOnline: driver.isOnline,
      hasLocation: !!(driver.currentLat && driver.currentLng),
      location: driver.currentLat && driver.currentLng 
        ? { lat: driver.currentLat, lng: driver.currentLng }
        : null,
      hasPushToken: !!driver.user.pushToken,
      pushTokenLength: driver.user.pushToken?.length || 0,
      pushTokenPreview: driver.user.pushToken 
        ? `${driver.user.pushToken.substring(0, 20)}...${driver.user.pushToken.substring(driver.user.pushToken.length - 10)}`
        : null,
    };

    // Check if driver would be found by notification query
    const wouldBeFound = 
      driver.serviceType === 'taxi' &&
      driver.isVerified === true &&
      driver.isOnline === true &&
      !!driver.user.pushToken &&
      !!(driver.currentLat && driver.currentLng);

    return NextResponse.json({
      success: true,
      driver: {
        name: driver.user.fullName,
        phone: driver.user.phone,
      },
      checks,
      wouldBeFound,
      issues: [
        !driver.isVerified && 'Driver is not verified',
        !driver.isOnline && 'Driver is offline',
        !driver.user.pushToken && 'Driver has no push token',
        !(driver.currentLat && driver.currentLng) && 'Driver has no location data',
      ].filter(Boolean),
    });
  } catch (error: any) {
    console.error('Check driver error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check driver' },
      { status: 500 }
    );
  }
}
