import { Router, type Response } from 'express';
import { verifyToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { ProfileSchema } from '../schemas';
import { db } from '../config';
import {
  getProfileByUid,
  updateProfileByUid
} from '../services/profile.service';
import {
  bloomFilterMiddleware,
  cacheMiddleware,
  scrapingPreventerMiddleware
} from '../middleware/cacheProtection';
import { addToBloomFilter } from '../services/cacheService';
import type { AuthedRequest } from '../types';

const router = Router();

// GET /api/search
router.get(
  '/search',
  verifyToken,
  scrapingPreventerMiddleware,
  async (req: AuthedRequest<any, any, any>, res: Response): Promise<any> => {
    try {
      const { q, category } = req.query;

      let queryRef: admin.firestore.Query = db.collection('profiles');

      if (category) {
        queryRef = queryRef.where('category', '==', category);
      }

      const results = await queryRef.limit(100).get();

      let talents: any[] = results.docs.map(doc => {
        const data = doc.data() || {};
        const { 
          fcmToken, 
          fcmTokens,
          twoFactorSecret, 
          twoFactorBackupCodes,
          loginAttempts,
          email,
          phone,
          showContactInfo,
          ...rest
        } = data;

        const isOwner = req.user?.uid === doc.id;
        const isAdminUser = req.user?.admin === true;

        const talent: any = {
          id: doc.id,
          ...rest,
          showContactInfo
        };

        if (isOwner || isAdminUser || showContactInfo === true) {
          talent.email = email;
          talent.phone = phone;
        }

        return talent;
      });

      if (q) {
        const queryStr = (q as string).toLowerCase();
        talents = talents.filter(talent => 
          talent.name?.toLowerCase().includes(queryStr) ||
          talent.displayName?.toLowerCase().includes(queryStr) ||
          talent.bio?.toLowerCase().includes(queryStr)
        );
      }

      return res.json({ success: true, talents });
    } catch (error: any) {
      console.error('Search proxy error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }
);

// GET /api/profiles/:userId
router.get(
  '/profiles/:userId',
  verifyToken,
  scrapingPreventerMiddleware,
  async (req: AuthedRequest<{ userId: string }>, res: Response): Promise<any> => {
    try {
      const data = await getProfileByUid(req.params.userId);
      if (!data) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const { 
        fcmToken, 
        fcmTokens,
        twoFactorSecret,
        twoFactorBackupCodes,
        loginAttempts,
        ...safeProfile 
      } = data;

      const isOwner = req.user?.uid === req.params.userId;
      const isAdminUser = req.user?.admin === true;
      if (!isOwner && !isAdminUser && !safeProfile.showContactInfo) {
        delete safeProfile.email;
        delete safeProfile.phone;
      }

      return res.json({ 
        success: true, 
        profile: safeProfile 
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load profile' });
    }
  }
);

// GET /api/users/:uid/profile
router.get(
  '/users/:uid/profile',
  verifyToken,
  scrapingPreventerMiddleware,
  bloomFilterMiddleware('profile'),
  cacheMiddleware(
    (req) => `profile:${req.params.uid}`,
    300
  ),
  async (req: AuthedRequest<{ uid: string }>, res: Response): Promise<any> => {
    try {
      const data = await getProfileByUid(req.params.uid);
      if (!data) {
        return res.status(404).send('Profile not found');
      }

      delete data.twoFactorBackupCodes;
      delete data.twoFactorSecret;

      const isOwner = req.user?.uid === req.params.uid;
      const isAdminUser = req.user?.admin === true;
      if (!isOwner && !isAdminUser && !data.showContactInfo) {
        delete data.email;
        delete data.phone;
      }

      return res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch profile';
      return res.status(500).json({ error: message });
    }
  }
);

// POST /api/profile
router.post(
  '/profile',
  verifyToken,
  validateBody(ProfileSchema),
  async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).send('Unauthorized');
      }

      await updateProfileByUid(uid, req.body);

      addToBloomFilter('profile', uid);
      addToBloomFilter('user', uid);

      return res.json({ success: true });
    } catch (error: unknown) {
      console.error('Profile update failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      return res.status(500).json({ error: message });
    }
  }
);

export default router;
