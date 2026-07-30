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
    }
    catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid token',
            errorCode: 'UNAUTHORIZED'
        });
    }
};
export const optionalAuth = async (req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const bearerHeader = req.headers.authorization;
    const match = bearerHeader?.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1];
    if (!token) {
        return next();
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists && userDoc.data()?.status === 'banned') {
            req.user = undefined;
        }
    } catch (_error) {
        req.user = undefined;
    }
    next();
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
    res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required',
        errorCode: 'FORBIDDEN'
    });
};
