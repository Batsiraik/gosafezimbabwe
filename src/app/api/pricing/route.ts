import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findMany({
      where: {
        key: {
          in: [
            'ride_price_per_km',
            'parcel_price_per_km',
            'parcel_min_price',
          ],
        },
      },
    });

    // Convert to object for easier access
    const settingsObj: Record<string, string> = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json({
      ridePricePerKm: parseFloat(settingsObj['ride_price_per_km'] || '0.60'),
      parcelPricePerKm: parseFloat(settingsObj['parcel_price_per_km'] || '0.40'),
      parcelMinPrice: parseFloat(settingsObj['parcel_min_price'] || '2.00'),
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    // Return defaults on error
    return NextResponse.json({
      ridePricePerKm: 0.60,
      parcelPricePerKm: 0.40,
      parcelMinPrice: 2.00,
    });
  }
}
