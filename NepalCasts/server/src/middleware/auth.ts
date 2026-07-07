import type { Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config';
import type { AuthedRequest } from '../types';

export const verifyToken = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
  const bearerHeader = req.headers.authorization;
  const match = bearerHeader?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing token',
      errorCode: 'UNAUTHORIZED'
    });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists && userDoc.data()?.status === 'banned') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Your account has been suspended',
        errorCode: 'SUSPENDED'
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token',
      errorCode: 'UNAUTHORIZED'
    });
  }
};

export const isAdmin = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing user credentials',
      errorCode: 'UNAUTHORIZED'
    });
    return;
  }

  if (req.user?.admin === true) {
    next();
    return;
  }

  // Safe fallback to auto-set claims for legacy users who haven't logged in since custom claims migration
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists && userDoc.data()?.isAdmin === true) {
    try {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      if (req.user) {
        req.user.admin = true;
      }
    } catch (err) {
      console.error(`Failed to auto-set custom claim for user ${uid}:`, err);
    }
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Forbidden: Admin access required',
    errorCode: 'FORBIDDEN'
  });
};
