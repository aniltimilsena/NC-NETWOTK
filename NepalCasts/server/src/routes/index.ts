import { Router, type Response } from 'express';
import { db, admin } from '../config';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import castingRoutes from './casting.routes';
import messagingRoutes from './messaging.routes';
import uploadRoutes from './upload.routes';
import notificationRoutes from './notification.routes';

const router = Router();

// Mount individual route domains
router.use(authRoutes);
router.use(profileRoutes);
router.use(castingRoutes);
router.use(messagingRoutes);
router.use(uploadRoutes);
router.use(notificationRoutes);

// General client error logger route: POST /api/errors/log
router.post('/errors/log', async (req, res) => {
  try {
    await db.collection('client_errors').add({
      ...req.body,
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.ip || null,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[ErrorLogger] Failed to write client error to Firestore:', error);
    res.json({ success: false });
  }
});

export default router;
