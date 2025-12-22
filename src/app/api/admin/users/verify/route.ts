import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decoded.adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, isVerified } = await request.json();

    if (!userId || typeof isVerified !== 'boolean') {
      return NextResponse.json({ error: 'User ID and verification status are required' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified },
    });

    return NextResponse.json({ message: 'User verified successfully' });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
  }
}
