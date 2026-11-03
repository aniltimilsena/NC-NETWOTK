import type { Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import NodeCache from 'node-cache';
import { db } from '../config';
import type { AuthedRequest } from '../types';

const jwksCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

function isValidClerkIssuer(iss: unknown): boolean {
    if (typeof iss !== 'string') return false;
    try {
        const parsed = new URL(iss);
        if (parsed.protocol !== 'https:') return false;

        const configuredIssuer = process.env.CLERK_ISSUER_URL;
        if (configuredIssuer && iss.replace(/\/$/, '') === configuredIssuer.replace(/\/$/, '')) {
            return true;
        }

        // Official Clerk development and production instances
        if (/^[a-zA-Z0-9-]+\.clerk\.accounts\.dev$/.test(parsed.hostname)) {
            return true;
        }
        if (parsed.hostname === 'clerk.com' || parsed.hostname.endsWith('.clerk.com')) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

/**
 * Verifies a Clerk-issued JWT using Clerk's JWKS public keys.
 */
async function verifyClerkToken(token: string): Promise<any | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) return null;
        if (payload.nbf && payload.nbf > now) return null;

        if (!isValidClerkIssuer(payload.iss)) return null;

        const kid = header.kid;
        let publicKeyPem: string | null = null;

        if (kid) {
            publicKeyPem = jwksCache.get<string>(`jwks_${kid}`) || null;
            if (!publicKeyPem) {
                const parsedIss = new URL(payload.iss);
                const jwksUrl = `https://${parsedIss.hostname}/.well-known/jwks.json`;
                const res = await fetch(jwksUrl).catch(() => null);
                if (res && res.ok) {
                    const jwks = await res.json() as any;
                    const key = jwks.keys?.find((k: any) => k.kid === kid);
                    if (key) {
                        const jwkKey = crypto.createPublicKey({ key, format: 'jwk' });
                        publicKeyPem = jwkKey.export({ type: 'spki', format: 'pem' }) as string;
                        jwksCache.set(`jwks_${kid}`, publicKeyPem);
                    }
                }
            }
        }

        if (publicKeyPem) {
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(`${parts[0]}.${parts[1]}`);
            const isValid = verifier.verify(publicKeyPem, Buffer.from(parts[2], 'base64url'));
            if (!isValid) return null;
        } else {
            // Could not fetch or locate the public key — reject to avoid signature bypass
            return null;
        }

        const isUserAdmin = payload.public_metadata?.isAdmin === true || payload.admin === true;

        return {
            uid: payload.sub,
            sub: payload.sub,
            email: payload.email || payload.primary_email_address || '',
            name: payload.name || payload.full_name || '',
            picture: payload.picture || payload.image_url || '',
            admin: isUserAdmin,
            isAdmin: isUserAdmin,
            auth_time: payload.iat || now,
            provider: 'clerk',
        };
    } catch {
        return null;
    }
}

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
        let decodedToken: any = null;

        // 1. Try Firebase ID Token verification
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (_fbErr) {
            // 2. Fallback to Clerk JWT verification
            decodedToken = await verifyClerkToken(token);
        }

        if (!decodedToken || !decodedToken.uid) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized: Invalid token',
                errorCode: 'UNAUTHORIZED'
            });
            return;
        }

        req.user = decodedToken;

        try {
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (userDoc.exists && userDoc.data()?.status === 'banned') {
                res.status(403).json({
                    success: false,
                    message: 'Forbidden: Your account has been suspended',
                    errorCode: 'SUSPENDED'
                });
                return;
            }
        } catch (_dbErr) {
            // Ignore Firestore admin connectivity errors if ADC credentials are not configured
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

export const optionalAuth = async (req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const bearerHeader = req.headers.authorization;
    const match = bearerHeader?.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1];

    if (!token) {
        return next();
    }

    try {
        let decodedToken: any = null;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (_fbErr) {
            decodedToken = await verifyClerkToken(token);
        }

        if (decodedToken && decodedToken.uid) {
            req.user = decodedToken;
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            if (userDoc.exists && userDoc.data()?.status === 'banned') {
                req.user = undefined;
            }
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

    if (req.user?.admin === true || req.user?.isAdmin === true) {
        next();
        return;
    }

    // Check database flag
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists && (userDoc.data()?.isAdmin === true || userDoc.data()?.role?.toLowerCase() === 'admin')) {
            next();
            return;
        }
    } catch {
        // DB check failed
    }

    res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required',
        errorCode: 'FORBIDDEN'
    });
};
