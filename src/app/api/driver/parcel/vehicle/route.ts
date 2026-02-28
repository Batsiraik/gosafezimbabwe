import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const maxDuration = 60;

// PATCH /api/driver/parcel/vehicle - Update vehicle (bike) details
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let decoded: { userId?: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }
    let body: { bikeRegistration?: string; bikePictureUrl?: string };
    try {
      body = await request.json();
    } catch (e: unknown) {
      if (e instanceof Error && (e.message?.includes('too large') || e.message?.includes('Payload'))) {
        return NextResponse.json(
          { error: 'Request too large. Use smaller images (under 5MB).' },
          { status: 413 }
        );
      }
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { bikeRegistration, bikePictureUrl } = body;
    if (!bikeRegistration?.trim() || !bikePictureUrl) {
      return NextResponse.json(
        { error: 'bikeRegistration and bikePictureUrl are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });
    if (!existing || existing.serviceType !== 'parcel') {
      return NextResponse.json({ error: 'Parcel driver profile not found' }, { status: 404 });
    }

    const updated = await prisma.driver.update({
      where: { id: existing.id },
      data: {
        carRegistration: bikeRegistration.trim().toUpperCase(),
        carPictureUrl: bikePictureUrl,
        isVerified: false,
      },
    });
    return NextResponse.json({
      message: 'Vehicle details updated. Awaiting admin verification.',
      driver: updated,
    });
  } catch (error) {
    console.error('Parcel vehicle update error:', error);
    return NextResponse.json({ error: 'Failed to update vehicle details' }, { status: 500 });
  }
}
