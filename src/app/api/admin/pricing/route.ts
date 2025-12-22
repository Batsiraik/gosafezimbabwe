import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Verify admin token
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as { userId: string; email: string; role?: string };

    // Check if user is admin
    const admin = await prisma.admin.findUnique({
      where: { email: decoded.email },
    });

    if (!admin) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - Fetch all pricing settings
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.appSettings.findMany({
      where: {
        key: {
          in: [
            'ride_price_per_km',
            'parcel_price_per_km',
            'parcel_min_price',
            'whatsapp_support_number',
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
      whatsappNumber: settingsObj['whatsapp_support_number'] || '263776954448',
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing settings' },
      { status: 500 }
    );
  }
}

// PATCH - Update pricing settings
export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      ridePricePerKm,
      parcelPricePerKm,
      parcelMinPrice,
      whatsappNumber,
    } = body;

    const updates: Promise<any>[] = [];

    if (ridePricePerKm !== undefined) {
      updates.push(
        prisma.appSettings.upsert({
          where: { key: 'ride_price_per_km' },
          update: { value: ridePricePerKm.toString() },
          create: {
            key: 'ride_price_per_km',
            value: ridePricePerKm.toString(),
            description: 'Price per kilometer for ride service (in USD)',
          },
        })
      );
    }

    if (parcelPricePerKm !== undefined) {
      updates.push(
        prisma.appSettings.upsert({
          where: { key: 'parcel_price_per_km' },
          update: { value: parcelPricePerKm.toString() },
          create: {
            key: 'parcel_price_per_km',
            value: parcelPricePerKm.toString(),
            description: 'Price per kilometer for parcel delivery (in USD)',
          },
        })
      );
    }

    if (parcelMinPrice !== undefined) {
      updates.push(
        prisma.appSettings.upsert({
          where: { key: 'parcel_min_price' },
          update: { value: parcelMinPrice.toString() },
          create: {
            key: 'parcel_min_price',
            value: parcelMinPrice.toString(),
            description: 'Minimum price for parcel delivery (in USD)',
          },
        })
      );
    }

    if (whatsappNumber !== undefined) {
      updates.push(
        prisma.appSettings.upsert({
          where: { key: 'whatsapp_support_number' },
          update: { value: whatsappNumber },
          create: {
            key: 'whatsapp_support_number',
            value: whatsappNumber,
            description: 'WhatsApp support number for customer support',
          },
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing settings' },
      { status: 500 }
    );
  }
}
