import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { formatPhoneNumber } from '@/lib/utils/phone';

// DELETE /api/user/delete - Delete user account
export async function DELETE(request: NextRequest) {
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
    const { confirmPhone } = body;

    if (!confirmPhone) {
      return NextResponse.json(
        { error: 'Phone number confirmation is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Format the provided phone number for comparison
    const formattedConfirmPhone = formatPhoneNumber(confirmPhone);

    // Verify phone number matches
    if (formattedConfirmPhone !== user.phone) {
      return NextResponse.json(
        { error: 'Phone number does not match. Please enter your registered phone number.' },
        { status: 400 }
      );
    }

    // Delete the user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: decoded.userId },
    });

    return NextResponse.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
