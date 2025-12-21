import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPhoneNumber } from '@/lib/utils/phone';
import jwt from 'jsonwebtoken';

// Test OTP - always 123456
const TEST_OTP = '123456';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone);

    // Verify OTP (for now, always accept 123456)
    if (otp !== TEST_OTP) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please use 123456 for testing.' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate JWT token (using a simple secret for now)
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    // Return user data and token
    return NextResponse.json(
      {
        message: 'OTP verified successfully',
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          profilePictureUrl: user.profilePictureUrl,
          idDocumentUrl: user.idDocumentUrl,
          licenseUrl: user.licenseUrl,
          isVerified: user.isVerified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
