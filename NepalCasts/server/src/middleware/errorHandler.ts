import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as admin from 'firebase-admin';
export const errorHandler = async (error: any, req: Request, res: Response, _next: NextFunction): Promise<any> => {
    const isProd = process.env.NODE_ENV === 'production';
    const requestId = (req as any).id || res.getHeader('X-Request-ID') || 'unknown';
    let statusCode = 500;
    let clientMessage = 'An unexpected error occurred. Please try again later.';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let issueDetails: any = undefined;
    if (error instanceof multer.MulterError) {
        statusCode = 400;
        clientMessage = error.message;
        errorCode = 'MULTER_ERROR';
    }
    else if (error instanceof Error &&
        (error.message === 'Only image uploads are allowed' ||
            error.message === 'Only image and video uploads are allowed')) {
        statusCode = 400;
        clientMessage = error.message;
        errorCode = 'INVALID_FILE_TYPE';
    }
    else if (error instanceof z.ZodError) {
        statusCode = 400;
        clientMessage = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
        issueDetails = error.issues;
    }
    else if (error.status || error.statusCode) {
        statusCode = error.status || error.statusCode;
        if (statusCode < 500) {
            clientMessage = error.message || 'Bad Request';
        }
        else {
            clientMessage = isProd ? 'An unexpected error occurred. Please try again later.' : (error.message || clientMessage);
        }
    }
    console.error(`[Server Error] [ReqID: ${requestId}] [${req.method} ${req.url}] Status: ${statusCode}`, {
        requestId,
        method: req.method,
        url: req.url,
        userId: (req as any).user?.uid || null,
        ip: req.ip || null,
        statusCode,
        message: error.message || 'Unknown error',
        stack: error.stack || null,
    });
    try {
        const firestoreDb = admin.firestore();
        await firestoreDb.collection('error_logs').add({
            requestId,
            message: error.message || 'Unknown error',
            stack: error.stack || null,
            method: req.method,
            url: req.url,
            userId: (req as any).user?.uid || null,
            ip: req.ip || null,
            statusCode,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (logError) {
        console.error('[ErrorLogger] Failed to write error to Firestore:', logError);
    }
    if (isProd && statusCode >= 500) {
        clientMessage = 'An unexpected error occurred. Please try again later.';
    }
    const responsePayload: Record<string, any> = {
        success: false,
        message: clientMessage,
        error: clientMessage,
        errorCode,
        requestId,
    };
    if (issueDetails && (!isProd || errorCode === 'VALIDATION_ERROR')) {
        responsePayload.details = issueDetails;
    }
    return res.status(statusCode).json(responsePayload);
};
