import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    ) as { userId: string; phone: string };

    const body = await request.json();
    const { idDocumentUrl } = body;

    if (!idDocumentUrl) {
      return NextResponse.json(
        { error: 'ID document URL is required' },
        { status: 400 }
      );
    }

    // Update user's ID document URL
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { idDocumentUrl },
      select: {
        id: true,
        fullName: true,
        phone: true,
        profilePictureUrl: true,
        idDocumentUrl: true,
        licenseUrl: true,
        isVerified: true,
      },
    });

    return NextResponse.json(
      { 
        message: 'ID document uploaded successfully',
        user 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Upload ID error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
