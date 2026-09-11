import admin from 'firebase-admin';
import * as jose from 'jose';
const JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

// In-process sliding-window rate limiter: 20 admin actions per 60 seconds per admin UID
const adminRateLimitMap = new Map();
function checkAdminRateLimit(uid) {
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 20;
    const entry = adminRateLimitMap.get(uid) || { count: 0, windowStart: now };
    if (now - entry.windowStart > windowMs) {
        entry.count = 0;
        entry.windowStart = now;
    }
    entry.count += 1;
    adminRateLimitMap.set(uid, entry);
    if (entry.count > maxRequests) {
        throw Object.assign(new Error('Too many admin actions. Try again in 60 seconds.'), { status: 429 });
    }
}
function initFirebaseAdmin() {
    if (admin.apps.length > 0)
        return;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = rawKey.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey })
        });
    }
    else {
        admin.initializeApp({ projectId });
    }
}
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (m) => {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return m;
        }
    }).trim();
}
async function verifyAdmin(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token)
        throw Object.assign(new Error('Unauthorized: No token'), { status: 401 });
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
    const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
    });
    const uid = payload.sub;
    if (payload.admin !== true) {
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
            throw Object.assign(new Error('Forbidden: Not an admin'), { status: 403 });
        }
        try {
            await admin.auth().setCustomUserClaims(uid, { admin: true });
        }
        catch (err) {
            console.error(`Failed to auto-set custom claim for user ${uid}:`, err);
        }
    }
    return {
        uid,
        email: payload.email || '',
        ...payload,
    };
}
async function readBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(data || '{}'));
            }
            catch {
                resolve({});
            }
        });
        req.on('error', () => resolve({}));
    });
}
async function batchDelete(db, snap) {
    if (!snap || snap.empty)
        return;
    let batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count === 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0)
        await batch.commit();
}
export default async function handler(req, res) {
    const allowedOrigins = ['https://nc-netwotk.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin && process.env.NODE_ENV !== 'production') {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS')
        return res.status(200).end();
    if (req.method !== 'POST')
        return res.status(405).json({ error: 'Method not allowed' });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    try {
        initFirebaseAdmin();
    }
    catch (e) {
        return res.status(500).json({ error: 'Initialization error' });
    }
    let adminUser;
    try {
        adminUser = await verifyAdmin(req);
    }
    catch (authErr) {
        return res.status(authErr.status || 401).json({ error: authErr.message });
    }
    // Rate-limit after successful auth so only valid admins consume the counter
    try {
        checkAdminRateLimit(adminUser.uid);
    } catch (rlErr) {
        return res.status(rlErr.status || 429).json({ error: rlErr.message });
    }
    const db = admin.firestore();
    const auth = admin.auth();
    const adminUid = adminUser.uid;
    const adminEmail = adminUser.email || 'Unknown Admin';
    const { userId, action } = req.query;
    if (!action || typeof action !== 'string' || !['delete', 'ban', 'unban', 'log'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
    if (action === 'log') {
        const body = await readBody(req);
        const { action: logAction, targetId, details } = body;
        if (!logAction || typeof logAction !== 'string' || logAction.trim().length === 0 || logAction.length > 200) {
            return res.status(400).json({ error: 'Invalid logAction' });
        }
        if (targetId && (typeof targetId !== 'string' || targetId.length > 200)) {
            return res.status(400).json({ error: 'Invalid targetId' });
        }
        if (details && (typeof details !== 'object' || Array.isArray(details))) {
            return res.status(400).json({ error: 'Invalid details' });
        }
        try {
            await db.collection('admin_logs').add({
                adminEmail,
                action: String(logAction).slice(0, 200),
                targetId: targetId || null,
                details: details || {},
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.status(200).json({ success: true });
        }
        catch (e) {
            return res.status(500).json({ error: 'Failed to record log' });
        }
    }
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0 || userId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
        return res.status(400).json({ error: 'Invalid userId parameter' });
    }
    if (action === 'delete') {
        try {
            try {
                await auth.revokeRefreshTokens(userId);
            }
            catch { }
            try {
                await auth.deleteUser(userId);
            }
            catch { }
            try {
                const sessionsSnap = await db.collection('profiles').doc(userId).collection('sessions').get();
                await batchDelete(db, sessionsSnap);
            }
            catch { }
            try {
                await db.collection('users').doc(userId).delete();
            }
            catch { }
            try {
                await db.collection('profiles').doc(userId).delete();
            }
            catch { }
            const collectionsToClean = [
                { name: 'casting_calls', field: 'createdBy' },
                { name: 'saved_calls', field: 'userId' },
                { name: 'data_requests', field: 'userId' },
                { name: 'follows', field: 'followerId' },
                { name: 'follows', field: 'followingId' },
                { name: 'applications', field: 'userId' },
                { name: 'applications', field: 'creatorId' },
                { name: 'notifications', field: 'userId' },
                { name: 'notifications', field: 'recipientId' },
                { name: 'notifications', field: 'receiverId' },
                { name: 'notifications', field: 'senderId' },
                { name: 'reviews', field: 'reviewerId' },
                { name: 'reviews', field: 'targetUserId' },
                { name: 'reviews', field: 'targetUid' },
            ];
            for (const col of collectionsToClean) {
                try {
                    const snap = await db.collection(col.name).where(col.field, '==', userId).get();
                    await batchDelete(db, snap);
                }
                catch { }
            }
            try {
                await db.collection('deleted_users').add({
                    userId,
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    deletedBy: adminUid,
                });
                await db.collection('admin_logs').add({
                    adminEmail,
                    action: 'Delete User Account',
                    targetId: userId,
                    details: { deletedByAdminUid: adminUid },
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            catch { }
            return res.status(200).json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ error: 'Failed to delete user account' });
        }
    }
    if (action === 'ban') {
        const body = await readBody(req);
        const { reason, duration } = body;
        if (reason && (typeof reason !== 'string' || reason.length > 500)) {
            return res.status(400).json({ error: 'Reason must be a string up to 500 characters' });
        }
        if (duration && (typeof duration !== 'string' || !['1d', '7d', '30d', 'permanent'].includes(duration))) {
            return res.status(400).json({ error: 'Invalid ban duration' });
        }
        try {
            try {
                await auth.revokeRefreshTokens(userId);
            }
            catch { }
            try {
                await auth.updateUser(userId, { disabled: true });
            }
            catch { }
            let banExpiresAt = null;
            if (duration && duration !== 'permanent') {
                const days = { '1d': 1, '7d': 7, '30d': 30 }[duration];
                if (days) {
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + days);
                    banExpiresAt = admin.firestore.Timestamp.fromDate(expiry);
                }
            }
            const cleanReason = sanitizeString(reason) || 'No reason provided';
            const updateFields = {
                status: 'banned',
                bannedAt: admin.firestore.FieldValue.serverTimestamp(),
                bannedBy: adminUid,
                banReason: cleanReason,
                banExpiresAt,
            };
            await db.collection('users').doc(userId).update(updateFields);
            try {
                await db.collection('profiles').doc(userId).update(updateFields);
            }
            catch { }
            await db.collection('moderation_log').add({
                action: 'ban', userId,
                reason: reason || 'No reason provided',
                duration: duration || 'permanent',
                moderatorId: adminUid,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('admin_logs').add({
                adminEmail, action: 'Ban User Account', targetId: userId,
                details: { reason, duration, bannedByAdminUid: adminUid },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.status(200).json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ error: 'Failed to ban user account' });
        }
    }
    if (action === 'unban') {
        try {
            try {
                await auth.updateUser(userId, { disabled: false });
            }
            catch { }
            const removeFields = {
                status: 'Active',
                bannedAt: admin.firestore.FieldValue.delete(),
                bannedBy: admin.firestore.FieldValue.delete(),
                banReason: admin.firestore.FieldValue.delete(),
                banExpiresAt: admin.firestore.FieldValue.delete(),
            };
            await db.collection('users').doc(userId).update(removeFields);
            try {
                await db.collection('profiles').doc(userId).update(removeFields);
            }
            catch { }
            await db.collection('moderation_log').add({
                action: 'unban', userId, moderatorId: adminUid,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            await db.collection('admin_logs').add({
                adminEmail, action: 'Unban User Account', targetId: userId,
                details: { unbannedByAdminUid: adminUid },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.status(200).json({ success: true });
        }
        catch (err) {
            return res.status(500).json({ error: 'Failed to unban user account' });
        }
    }
}
export const config = {
    api: { bodyParser: false },
};
