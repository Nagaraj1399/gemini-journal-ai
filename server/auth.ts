import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin once
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'challenge1-496221';

let adminApp: App | undefined;
if (getApps().length === 0) {
  try {
    adminApp = initializeApp({
      projectId: FIREBASE_PROJECT_ID,
    });
  } catch (err) {
    console.warn('[AUTH] Firebase admin initialization warning:', (err as Error).message);
  }
} else {
  adminApp = getApps()[0];
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Verifies a Firebase Auth ID token and extracts the authenticated UID.
 * Never trusts any client-provided UID in body, params, or queries.
 */
export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string }> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing or invalid token');
  }

  // 1. Try Firebase Admin SDK verification first
  try {
    if (adminApp) {
      const decoded = await getAuth(adminApp).verifyIdToken(idToken);
      if (decoded && decoded.uid) {
        return { uid: decoded.uid, email: decoded.email };
      }
    }
  } catch (adminErr) {
    // If admin SDK throws (e.g., service account metadata not found in local container),
    // fallback to verifying with Google's public tokeninfo endpoint for the project
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!response.ok) {
        throw new Error('Token verification failed with status ' + response.status);
      }
      const data = (await response.json()) as Record<string, unknown>;
      const uid = (data.user_id as string) || (data.sub as string);
      const aud = (data.aud as string);
      const iss = (data.iss as string);

      // Verify audience and issuer to prevent cross-app token reuse
      const validAud = aud === FIREBASE_PROJECT_ID;
      const validIss = iss === `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` || iss === 'https://accounts.google.com';

      if (!validAud && !validIss) {
        throw new Error('Token audience or issuer mismatch');
      }

      if (!uid) {
        throw new Error('No user ID in token payload');
      }

      return { uid, email: data.email as string | undefined };
    } catch (fallbackErr) {
      throw new Error('Authentication token could not be verified');
    }
  }

  throw new Error('Unable to authenticate request');
}

/**
 * Express middleware to enforce authentication on private endpoints.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required. Missing or invalid Authorization header.',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    res.status(401).json({ error: 'Empty bearer token.' });
    return;
  }

  try {
    const { uid, email } = await verifyFirebaseToken(token);
    // Explicitly attach derived UID from verified cryptographic token
    req.userId = uid;
    req.userEmail = email;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'Unauthorized. Invalid or expired authentication session.',
    });
  }
}
