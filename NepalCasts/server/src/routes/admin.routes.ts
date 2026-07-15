import { Router, type Response, type NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { verifyToken, isAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { adminActionLimiter } from '../middleware/rateLimiter';
import { AdminLogSchema, AdminSettingsSchema } from '../schemas';
import { db } from '../config';
import {
  getAllProfiles,
  updateUserRole,
  deleteUserAccount,
  banUserAccount,
  unbanUserAccount
} from '../services/profile.service';
import type { AuthedRequest } from '../types';

const router = Router();

// GET /api/admin/users
router.get('/admin/users', verifyToken, isAdmin, adminActionLimiter, async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const users = await getAllProfiles();
    return res.json(users);

  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/admin/log
router.post(
  '/admin/log',
  verifyToken,
  isAdmin,
  validateBody(AdminLogSchema),
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const adminEmail = req.user?.email || "Unknown Admin";
      const body = req.body as any;
      await db.collection('admin_logs').add({
        adminEmail,
        action: body?.action,
        targetId: body?.targetId || null,
        details: body?.details || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      return res.json({ success: true });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/admin/settings
router.post(
  '/admin/settings',
  verifyToken,
  isAdmin,
  validateBody(AdminSettingsSchema),
  async (req: AuthedRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const body = (req.body as any) || {};
      await db.collection('settings').doc('global').set({
        ...body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return res.json({ success: true });
    } catch (error: unknown) {
      next(error);
    }
  }
);

// POST /api/admin/users/:userId/role
router.post('/admin/users/:userId/role', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response, next: NextFunction): Promise<any> => {
  const { userId } = req.params;
  const { makeAdmin } = req.body as any;
  const adminUid = req.user?.uid || 'unknown_admin';

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }
  if (typeof makeAdmin !== 'boolean') {
    return res.status(400).json({ success: false, error: 'makeAdmin must be a boolean' });
  }
  if (userId === adminUid) {
    return res.status(400).json({ success: false, error: 'Cannot modify your own admin status' });
  }

  try {
    const nextRole = await updateUserRole(userId, makeAdmin, adminUid);
    return res.json({ success: true, role: nextRole, isAdmin: makeAdmin });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/admin/users/:userId/delete
router.post('/admin/users/:userId/delete', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response, next: NextFunction): Promise<any> => {
  const { userId } = req.params;
  const adminUid = req.user?.uid || 'unknown_admin';
  const adminEmail = req.user?.email || 'Unknown Admin';

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await deleteUserAccount(userId, adminUid, adminEmail);
    return res.json({ success: true });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/admin/users/:userId/ban
router.post('/admin/users/:userId/ban', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response, next: NextFunction): Promise<any> => {
  const { userId } = req.params;
  const { reason, duration } = req.body as any;
  const adminUid = req.user?.uid || 'unknown_admin';
  const adminEmail = req.user?.email || 'Unknown Admin';

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await banUserAccount(userId, adminUid, adminEmail, reason, duration);
    return res.json({ success: true });
  } catch (error: unknown) {
    next(error);
  }
});

// POST /api/admin/users/:userId/unban
router.post('/admin/users/:userId/unban', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response, next: NextFunction): Promise<any> => {
  const { userId } = req.params;
  const adminUid = req.user?.uid || 'unknown_admin';
  const adminEmail = req.user?.email || 'Unknown Admin';

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    await unbanUserAccount(userId, adminUid, adminEmail);
    return res.json({ success: true });
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
