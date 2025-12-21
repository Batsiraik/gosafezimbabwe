import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPhoneNumber, isValidZimbabwePhone } from '@/lib/utils/phone';

// Test OTP - always 123456
const TEST_OTP = '123456';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phone);
    if (!isValidZimbabwePhone(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { 
          message: 'If a user exists with this phone number, an OTP has been sent.',
          otp: TEST_OTP // For testing only - remove in production
        },
        { status: 200 }
      );
    }

    // In production, send OTP via Twilio/SMS here
    // For now, return test OTP
    return NextResponse.json(
      {
        message: 'OTP sent to your phone number',
        otp: TEST_OTP, // For testing only - remove in production
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
