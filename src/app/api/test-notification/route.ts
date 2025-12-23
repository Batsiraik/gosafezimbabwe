import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { sendPushNotification } from '@/lib/send-push-notification';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * Test notification endpoint
 * GET /api/test-notification?token=YOUR_FCM_TOKEN
 * Or POST with token in body
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase
    initializeFirebaseAdmin();

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required. Add ?token=YOUR_FCM_TOKEN to the URL' },
        { status: 400 }
      );
    }

    // Send test notification
    const success = await sendPushNotification(token, {
      title: '🔔 Test Notification',
      body: 'If you received this, push notifications are working! 🎉',
      data: {
        type: 'test',
        message: 'This is a test notification from GO SAFE',
      },
      sound: 'notification_sound',
      priority: 'high',
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully!',
        token: token.substring(0, 20) + '...', // Show first 20 chars only
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification. Check server logs.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test notification' },
      { status: 500 }
    );
  }
}

/**
 * POST version - send test notification to logged-in user
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase
    initializeFirebaseAdmin();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Include Authorization header with your JWT token.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Get user's push token from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { pushToken: true, fullName: true },
    });

    if (!user || !user.pushToken) {
      return NextResponse.json(
        { error: 'No push token found for this user. Make sure you have allowed notifications in the app.' },
        { status: 400 }
      );
    }

    // Send test notification
    const success = await sendPushNotification(user.pushToken, {
      title: '🔔 Test Notification',
      body: `Hi ${user.fullName}! If you received this, push notifications are working! 🎉`,
      data: {
        type: 'test',
        message: 'This is a test notification from GO SAFE',
      },
      sound: 'notification_sound',
      priority: 'high',
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully!',
        sentTo: user.fullName,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification. Check server logs.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
