import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// POST /api/driver/bus/register - Register as bus service provider
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { nationalIdUrl, selfieUrl } = body;

    // Validation
    if (!nationalIdUrl || !selfieUrl) {
      return NextResponse.json(
        { error: 'National ID and selfie are required' },
        { status: 400 }
      );
    }

    // Check if bus provider profile already exists
    const existingProvider = await prisma.busProvider.findUnique({
      where: { userId: decoded.userId },
    });

    if (existingProvider) {
      // Update existing provider
      const provider = await prisma.busProvider.update({
        where: { id: existingProvider.id },
        data: {
          nationalIdUrl,
          selfieUrl,
          isVerified: false, // Reset verification when updating
        },
      });

      return NextResponse.json({
        message: 'Bus provider registration updated successfully',
        provider,
      });
    } else {
      // Create new provider
      const provider = await prisma.busProvider.create({
        data: {
          userId: decoded.userId,
          nationalIdUrl,
          selfieUrl,
          isVerified: false, // Admin will verify
        },
      });

      return NextResponse.json({
        message: 'Bus provider registration submitted successfully',
        provider,
      });
    }
  } catch (error: any) {
    console.error('Bus provider registration error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to register bus provider';
    if (error?.code === 'P2002') {
      errorMessage = 'A bus provider profile already exists for this user';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
