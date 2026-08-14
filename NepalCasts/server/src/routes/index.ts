import { Router, type Response } from 'express';
import { db, admin } from '../config';
import profileRoutes from './profile.routes';
import castingRoutes from './casting.routes';
import messagingRoutes from './messaging.routes';
import uploadRoutes from './upload.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';
const router = Router();
router.use(profileRoutes);
router.use(castingRoutes);
router.use(messagingRoutes);
router.use(uploadRoutes);
router.use(notificationRoutes);
router.use(adminRoutes);
router.post('/errors/log', async (req, res) => {
    try {
        const { message, stack, componentStack, url, userId, userAgent } = req.body || {};
        const safePayload = {
            message: typeof message === 'string' ? message.slice(0, 1000) : 'Unknown error',
            stack: typeof stack === 'string' ? stack.slice(0, 2000) : null,
            componentStack: typeof componentStack === 'string' ? componentStack.slice(0, 2000) : null,
            url: typeof url === 'string' ? url.slice(0, 500) : null,
            userId: typeof userId === 'string' ? userId.slice(0, 100) : null,
            userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : (req.headers['user-agent'] || null),
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            ip: req.ip || null,
        };
        await db.collection('client_errors').add(safePayload);
        res.json({ success: true });
    }
    catch (error) {
        console.error('[ErrorLogger] Failed to write client error to Firestore:', error);
        res.status(500).json({ success: false });
    }
});
export default router;
