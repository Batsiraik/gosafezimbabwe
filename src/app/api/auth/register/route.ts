import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPhoneNumber, isValidZimbabwePhone } from '@/lib/utils/phone';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phone, password } = body;

    // Validate input
    if (!fullName || !phone || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phone);
    if (!isValidZimbabwePhone(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please use a valid Zimbabwean number (e.g., 0776954448 or +263776954448)' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        phone: formattedPhone,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Store phone in session for OTP verification
    // In a real app, you'd use a session or Redis, but for now we'll return it
    // The frontend will store it temporarily

    return NextResponse.json(
      {
        message: 'User created successfully. Please verify OTP.',
        user: {
          id: user.id,
          phone: user.phone,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
