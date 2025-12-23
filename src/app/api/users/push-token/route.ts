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

    // Validate token format (FCM tokens are typically 100-200 chars, but can vary)
    if (typeof pushToken !== 'string' || pushToken.length < 50 || pushToken.length > 250) {
      console.warn(`[PUSH TOKEN] Invalid token format received. Length: ${pushToken?.length || 0}`);
      return NextResponse.json({ 
        error: 'Invalid push token format. Token should be 50-250 characters long.' 
      }, { status: 400 });
    }
    
    // Check for placeholder values
    if (pushToken.includes('YOUR_FCM_TOKEN') || pushToken.includes('placeholder')) {
      console.error(`[PUSH TOKEN] Token appears to be a placeholder`);
      return NextResponse.json({ 
        error: 'Invalid token: appears to be a placeholder value.' 
      }, { status: 400 });
    }

    // Log token storage (first/last chars only for security)
    console.log(`[PUSH TOKEN] Storing token for user ${decoded.userId}`);
    console.log(`[PUSH TOKEN] Token preview: ${pushToken.substring(0, 20)}...${pushToken.substring(pushToken.length - 10)}`);
    console.log(`[PUSH TOKEN] Token length: ${pushToken.length} characters`);

    // Update user with push token
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { 
        pushToken: pushToken.trim(), // Trim whitespace
      },
    });

    console.log(`[PUSH TOKEN] ✅ Token stored successfully for user ${decoded.userId}`);
    return NextResponse.json({ success: true, message: 'Push token stored' });
  } catch (error: any) {
    console.error('Error storing push token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store push token' },
      { status: 500 }
    );
  }
}
