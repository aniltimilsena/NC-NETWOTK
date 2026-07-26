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
        await db.collection('client_errors').add({
            ...req.body,
            serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            ip: req.ip || null,
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('[ErrorLogger] Failed to write client error to Firestore:', error);
        res.json({ success: false });
    }
});
export default router;
