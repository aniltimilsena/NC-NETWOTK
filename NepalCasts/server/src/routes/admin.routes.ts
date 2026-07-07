import { Router, type Response } from 'express';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { verifyToken, isAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
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
router.get('/admin/users', verifyToken, isAdmin, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const users = await getAllProfiles();
    const cleanUsers = users.map((user) => {
      delete user.twoFactorBackupCodes;
      delete user.twoFactorSecret;
      return user;
    });
    return res.json(cleanUsers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return res.status(500).json({ error: message });
  }
});

// POST /api/admin/log
router.post(
  '/admin/log',
  verifyToken,
  isAdmin,
  validateBody(AdminLogSchema),
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      const adminEmail = req.user?.email || "Unknown Admin";
      await db.collection('admin_logs').add({
        adminEmail,
        action: req.body.action,
        targetId: req.body.targetId || null,
        details: req.body.details || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
      return res.json({ success: true });
    } catch (error: unknown) {
      return res.status(500).json({ error: 'Failed to write admin log' });
    }
  }
);

// POST /api/admin/settings
router.post(
  '/admin/settings',
  verifyToken,
  isAdmin,
  validateBody(AdminSettingsSchema),
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      await db.collection('settings').doc('global').set({
        ...req.body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return res.json({ success: true });
    } catch (error: unknown) {
      return res.status(500).json({ error: 'Failed to update global settings' });
    }
  }
);

// POST /api/admin/users/:userId/role
router.post('/admin/users/:userId/role', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response): Promise<any> => {
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
    console.error('Failed to update user role:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user role';
    return res.status(500).json({ success: false, error: message });
  }
});

// POST /api/admin/users/:userId/delete
router.post('/admin/users/:userId/delete', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response): Promise<any> => {
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
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    console.error('Delete user error:', error);
    return res.status(500).json({ error: message });
  }
});

// POST /api/admin/users/:userId/ban
router.post('/admin/users/:userId/ban', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response): Promise<any> => {
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
    const message = error instanceof Error ? error.message : 'Failed to ban user';
    console.error('Ban user error:', error);
    return res.status(500).json({ error: message });
  }
});

// POST /api/admin/users/:userId/unban
router.post('/admin/users/:userId/unban', verifyToken, isAdmin, async (req: AuthedRequest<{ userId: string }>, res: Response): Promise<any> => {
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
    const message = error instanceof Error ? error.message : 'Failed to unban user';
    console.error('Unban user error:', error);
    return res.status(500).json({ error: message });
  }
});

// Handler helper to approve data exports
const handleDataRequestApprove = async (requestId: string, req: AuthedRequest, res: Response): Promise<void> => {
  const requestRef = db.collection('data_requests').doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    res.status(404).send('Not Found: Request not found');
    return;
  }

  const requestData = requestDoc.data();
  if (requestData?.status !== 'pending') {
    res.status(400).send('Bad Request: Request is not in pending status');
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; 

  const userId = requestData.userId || requestData.uid;
  const userEmail = requestData.userEmail || requestData.email;

  await db.collection('one_time_tokens').doc(token).set({
    uid: userId,
    email: userEmail,
    requestId: requestId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: expiresAt,
    used: false,
  });

  await requestRef.update({
    status: 'approved',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const downloadLink = `${frontendUrl}/api/data-export/download?token=${token}`;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NC Network Security" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Your Data Archive is Ready for Download',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #0b0b0c; color: #fff;">
          <h2 style="color: #FFD700;">NC Network</h2>
          <p style="color: #ccc;">Your request to download your account data has been approved.</p>
          <p style="color: #ccc;">You can download your archive by clicking the button below. This link is valid for <strong>24 hours</strong> and can only be used <strong>once</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadLink}" style="background-color: #00BFFF; color: #000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              Download Data Archive
            </a>
          </div>
          <p style="color: #999; font-size: 11px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${downloadLink}" style="color: #00BFFF;">${downloadLink}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;"/>
          <p style="color: #666; font-size: 11px;">
            If you did not request this data export, please contact support and update your security settings immediately.
          </p>
        </div>
      `,
    });
    console.log(`[Data Export] Email successfully sent to ${userEmail}`);
    res.send({ success: true, emailSent: true });
  } catch (emailError: any) {
    console.warn('[Data Export] Failed to send email to user but request approved:', emailError.message);
    console.log(`[Data Export] Manual download URL for user ${userEmail}: ${downloadLink}`);
    res.send({ success: true, emailSent: false, downloadLink });
  }
};

// POST /api/admin/data-export/approve (legacy)
router.post('/admin/data-export/approve', verifyToken, isAdmin, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { requestId } = req.body;
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).send('Bad Request: Missing requestId');
    }
    await handleDataRequestApprove(requestId, req, res);
  } catch (error: any) {
    console.error('Data export approval error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// POST /api/data-requests/:requestId/approve
router.post('/data-requests/:requestId/approve', verifyToken, isAdmin, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { requestId } = req.params;
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).send('Bad Request: Missing requestId');
    }
    await handleDataRequestApprove(requestId, req, res);
  } catch (error: any) {
    console.error('Data export approval error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// POST /api/data-requests/:requestId/reject
router.post('/data-requests/:requestId/reject', verifyToken, isAdmin, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).send('Bad Request: Missing requestId');
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).send('Bad Request: Missing rejection reason');
    }

    const requestRef = db.collection('data_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).send('Not Found: Request not found');
    }

    await requestRef.update({
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.send({ success: true });
  } catch (error: any) {
    console.error('Data export rejection error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

export default router;
