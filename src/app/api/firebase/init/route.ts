import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

/**
 * Initialize Firebase Admin SDK
 * This endpoint can be called on server startup or first request
 */
export async function GET() {
  try {
    initializeFirebaseAdmin();
    return NextResponse.json({ success: true, message: 'Firebase Admin initialized' });
  } catch (error: any) {
    console.error('Error initializing Firebase:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize Firebase' },
      { status: 500 }
    );
  }
}
