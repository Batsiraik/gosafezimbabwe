import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/drivers/nearby?lat=...&lng=...&radius=...&serviceType=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radiusKm = parseFloat(searchParams.get('radius') || '10'); // Default 10km radius for map display
    const serviceType = (searchParams.get('serviceType') || 'taxi') as 'taxi' | 'parcel';

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Get all online, verified drivers of the specified service type with location data
    const drivers = await prisma.driver.findMany({
      where: {
        serviceType: serviceType,
        isVerified: true,
        isOnline: true,
        currentLat: { not: null },
        currentLng: { not: null },
      },
      select: {
        userId: true,
        currentLat: true,
        currentLng: true,
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    });

    // Calculate distance and filter drivers within radius
    const nearbyDrivers = drivers
      .map((driver) => {
        if (!driver.currentLat || !driver.currentLng) return null;
        
        const distance = calculateDistance(
          lat,
          lng,
          driver.currentLat,
          driver.currentLng
        );

        return {
          userId: driver.userId,
          lat: driver.currentLat,
          lng: driver.currentLng,
          distance: distance,
          driverName: driver.user.fullName,
        };
      })
      .filter((driver): driver is NonNullable<typeof driver> => driver !== null && driver.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      drivers: nearbyDrivers,
      count: nearbyDrivers.length,
    });
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby drivers' },
      { status: 500 }
    );
  }
}
