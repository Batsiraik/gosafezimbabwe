import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const maxDuration = 60;

// PATCH /api/driver/taxi/vehicle - Update vehicle details (new car)
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
    let body: { carRegistration?: string; carPictureUrl?: string };
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
    const { carRegistration, carPictureUrl } = body;
    if (!carRegistration?.trim() || !carPictureUrl) {
      return NextResponse.json(
        { error: 'carRegistration and carPictureUrl are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.driver.findUnique({
      where: { userId: decoded.userId },
    });
    if (!existing || existing.serviceType !== 'taxi') {
      return NextResponse.json({ error: 'Taxi driver profile not found' }, { status: 404 });
    }

    const updated = await prisma.driver.update({
      where: { id: existing.id },
      data: {
        carRegistration: carRegistration.trim().toUpperCase(),
        carPictureUrl,
        isVerified: false,
      },
    });
    return NextResponse.json({
      message: 'Vehicle details updated. Awaiting admin verification.',
      driver: updated,
    });
  } catch (error) {
    console.error('Taxi vehicle update error:', error);
    return NextResponse.json({ error: 'Failed to update vehicle details' }, { status: 500 });
  }
}
