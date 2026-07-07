import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as admin from 'firebase-admin';

export const errorHandler = async (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  console.error('[Unhandled Server Error]:', error);

  let statusCode = 500;
  let message = 'An unexpected error occurred. Please try again later.';
  let errorCode = 'INTERNAL_SERVER_ERROR';

  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.message;
    errorCode = 'MULTER_ERROR';
  } else if (
    error instanceof Error &&
    (error.message === 'Only image uploads are allowed' ||
      error.message === 'Only image and video uploads are allowed')
  ) {
    statusCode = 400;
    message = error.message;
    errorCode = 'INVALID_FILE_TYPE';
  } else if (error instanceof z.ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';

    try {
      const firestoreDb = admin.firestore();
      await firestoreDb.collection('error_logs').add({
        message: 'Validation failed',
        stack: error.stack || null,
        method: req.method,
        url: req.url,
        userId: (req as any).user?.uid || null,
        ip: req.ip || null,
        statusCode,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (logError) {
      console.error('[ErrorLogger] Failed to write validation error to Firestore:', logError);
    }

    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      details: error.issues,
    });
  } else if (error.status || error.statusCode) {
    statusCode = error.status || error.statusCode;
    message = error.message || message;
  }

  try {
    const firestoreDb = admin.firestore();
    await firestoreDb.collection('error_logs').add({
      message: error.message || 'Unknown error',
      stack: error.stack || null,
      method: req.method,
      url: req.url,
      userId: (req as any).user?.uid || null,
      ip: req.ip || null,
      statusCode,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    console.error('[ErrorLogger] Failed to write error to Firestore:', logError);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again later.'
        : message,
    errorCode,
  });
};
