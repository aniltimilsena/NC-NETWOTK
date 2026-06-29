import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export const errorLogger = async (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  // Log to Firestore for review
  try {
    const db = admin.firestore();
    await db.collection('error_logs').add({
      message: err.message || 'Unknown error',
      stack: err.stack || null,
      method: req.method,
      url: req.url,
      userId: (req as any).user?.uid || null,
      ip: req.ip || null,
      statusCode: err.status || err.statusCode || 500,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    // Silent fail
    console.error('[ErrorLogger] Failed to write error to Firestore:', logError);
  }

  // Send generic error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message || 'Internal Server Error',
  });
};
