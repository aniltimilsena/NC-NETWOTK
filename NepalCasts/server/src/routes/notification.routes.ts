import { Router, type Response } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { NotificationTokenSchema } from '../schemas';
import { db } from '../config';
import { sendOneSignalNotification } from '../services/notification.service';
import type { AuthedRequest } from '../types';
const router = Router();
const MAX_FCM_TOKENS = 20;
const FCM_TOKEN_LIMIT_REACHED = 'FCM_TOKEN_LIMIT_REACHED';
const handleSendNotification = async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const { userId, title, body, data, url, convoId, senderName, previewText, otherParticipants } = (req.body as any) || {};
        const restApiKey = process.env.ONESIGNAL_REST_API_KEY;
        const appId = process.env.ONESIGNAL_APP_ID;
        if (!appId || !restApiKey) {
            console.error('OneSignal Configuration Error: ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY is missing on server.');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        let recipients: string[] = [];
        let headingsText = title || 'New Notification';
        let contentsText = body || '';
        let targetUrl = url || 'https://nc-netwotk.vercel.app';
        if (userId) {
            recipients = [userId];
        }
        else if (otherParticipants && Array.isArray(otherParticipants)) {
            const senderId = req.user?.uid;
            recipients = otherParticipants.filter(uid => uid !== senderId);
        }
        if (convoId && senderName && previewText) {
            headingsText = `New Message from ${senderName}`;
            contentsText = previewText;
            targetUrl = `https://nc-netwotk.vercel.app/messages/${convoId}`;
        }
        if (recipients.length === 0) {
            return res.json({ success: true, message: 'No recipients to notify' });
        }
        let buttons: Array<{
            id: string;
            text: string;
            icon?: string;
        }> | undefined = undefined;
        if (headingsText.toLowerCase().includes('message')) {
            buttons = [
                { id: 'reply_chat', text: 'Reply' },
                { id: 'view_chat', text: 'Open Chat' }
            ];
        }
        else if (headingsText.toLowerCase().includes('call')) {
            buttons = [
                { id: 'call_back', text: 'Call Back' }
            ];
        }
        await sendOneSignalNotification({
            userIds: recipients,
            title: headingsText,
            body: contentsText,
            url: targetUrl.replace('https://nc-netwotk.vercel.app', ''),
            buttons
        });
        return res.json({ success: true });
    }
    catch (error: any) {
        console.error('Notification proxy error:', error);
        return res.status(500).json({ error: 'Notification failed', message: error.message });
    }
};
router.post('/notifications/send', verifyToken, handleSendNotification);
router.post('/send-notification', verifyToken, handleSendNotification);
router.post('/notifications/register-token', verifyToken, validateBody(NotificationTokenSchema), async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const { token } = req.body as any;
        if (!token || !req.user) {
            return res.status(400).send('Missing token or user');
        }
        const privateSettingsRef = db.collection('users').doc(req.user.uid).collection('private').doc('settings');
        await db.runTransaction(async (transaction) => {
            const settingsSnapshot = await transaction.get(privateSettingsRef);
            const existingRaw = settingsSnapshot.data()?.fcmTokens;
            const existingTokens = Array.isArray(existingRaw)
                ? existingRaw.filter((item): item is string => typeof item === 'string')
                : [];
            if (existingTokens.includes(token)) {
                return;
            }
            if (existingTokens.length >= MAX_FCM_TOKENS) {
                throw new Error(FCM_TOKEN_LIMIT_REACHED);
            }
            transaction.set(privateSettingsRef, {
                fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
            }, { merge: true });
        });
        return res.json({ success: true });
    }
    catch (error: unknown) {
        if (error instanceof Error && error.message === FCM_TOKEN_LIMIT_REACHED) {
            return res.status(400).json({ error: `FCM token limit reached (${MAX_FCM_TOKENS})` });
        }
        const message = error instanceof Error ? error.message : 'Failed to register token';
        return res.status(500).json({ error: message });
    }
});
router.get('/notifications/unread-count', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        const profileDoc = await db.collection('profiles').doc(uid).get();
        const profileData = profileDoc.data();
        const lastCheckedAt = profileData?.lastCheckedAt || new admin.firestore.Timestamp(0, 0);
        const userSkills = profileData?.skills || [];
        const conversationsSnapshot = await db.collection('conversations')
            .where('participants', 'array-contains', uid)
            .get();

        let unreadMessages = 0;
        conversationsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data && !data.deletedFor?.[uid]) {
                const count = data.unreadCounts?.[uid];
                if (typeof count === 'number' && count > 0) {
                    unreadMessages += count;
                }
            }
        });
        let castingSnapshot = await db.collection('casting_calls')
            .where('createdAt', '>', lastCheckedAt)
            .get();
        let newCastingCalls = 0;
        if (userSkills.length > 0) {
            newCastingCalls = castingSnapshot.docs.filter(doc => {
                const data = doc.data();
                return userSkills.some((skill: any) => (typeof skill === 'string' && skill.toLowerCase() === data.type?.toLowerCase()) ||
                    (data.skills && Array.isArray(data.skills) && data.skills.includes(skill)));
            }).length;
        }
        else {
            newCastingCalls = castingSnapshot.size;
        }
        return res.json({
            unreadMessages,
            newCastingCalls,
            total: unreadMessages + newCastingCalls,
            lastCheckedAt: lastCheckedAt.toDate().toISOString()
        });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch unread count';
        return res.status(500).json({ error: message });
    }
});
router.post('/notifications/mark-as-read', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await db.collection('profiles').doc(uid).set({
            lastCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.json({ success: true });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to update checked status';
        return res.status(500).json({ error: message });
    }
});
export default router;
