import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * Store push notification token for a user
 * POST /api/users/push-token
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { pushToken } = await request.json();

    if (!pushToken) {
      return NextResponse.json({ error: 'Push token is required' }, { status: 400 });
    }

    // Update user with push token
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { 
        pushToken: pushToken,
      },
    });

    return NextResponse.json({ success: true, message: 'Push token stored' });
  } catch (error: any) {
    console.error('Error storing push token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store push token' },
      { status: 500 }
    );
  }
}
