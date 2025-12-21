import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// GET /api/driver/bus/status - Get bus provider status and profile
export async function GET(request: NextRequest) {
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

    const provider = await prisma.busProvider.findUnique({
      where: { userId: decoded.userId },
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

    if (!provider) {
      return NextResponse.json({ provider: null });
    }

    return NextResponse.json({
      provider: {
        id: provider.id,
        isVerified: provider.isVerified,
      },
    });
  } catch (error) {
    console.error('Error fetching bus provider status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider status' },
      { status: 500 }
    );
  }
}
