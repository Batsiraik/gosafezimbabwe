import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPhoneNumber, isValidZimbabwePhone } from '@/lib/utils/phone';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
        profilePictureUrl: true,
        idDocumentUrl: true,
        licenseUrl: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Generate JWT token (bypassing OTP for internal testing)
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    // Return user data and token (skip OTP verification)
    return NextResponse.json(
      {
        message: 'Account created successfully!',
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
