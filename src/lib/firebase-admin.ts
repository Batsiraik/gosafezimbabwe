import * as admin from 'firebase-admin';

let firebaseAdmin: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Call this once when your server starts
 */
export function initializeFirebaseAdmin(): void {
  if (firebaseAdmin) {
    console.log('Firebase Admin already initialized');
    return;
  }

  try {
    // Option 1: Use service account from environment variable (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'gosafe-8da5a',
      });
    }
    // Option 2: Use service account key file path
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
        projectId: 'gosafe-8da5a',
      });
    }
    // Option 3: Use default credentials (for Vercel/serverless)
    else {
      // For Vercel, you'll need to set FIREBASE_SERVICE_ACCOUNT as an environment variable
      // containing the full JSON service account key
      console.warn('Firebase Admin: No service account configured. Set FIREBASE_SERVICE_ACCOUNT environment variable.');
      return;
    }

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

/**
 * Get Firebase Admin instance
 * Returns null if not initialized (instead of throwing)
 */
export function getFirebaseAdmin(): admin.app.App | null {
  if (!firebaseAdmin) {
    initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}
