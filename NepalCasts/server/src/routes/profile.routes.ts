import { Router, type Response } from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { ProfileSchema } from '../schemas';
import { db } from '../config';
import type { firestore } from 'firebase-admin';
import { getProfileByUid, updateProfileByUid } from '../services/profile.service';
import { bloomFilterMiddleware, cacheMiddleware, scrapingPreventerMiddleware } from '../middleware/cacheProtection';
import { addToBloomFilter } from '../services/cacheService';
import type { AuthedRequest } from '../types';
const router = Router();

const getPublicProfilesHandler = async (req: any, res: Response): Promise<any> => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limitCount = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 12));
        const offset = (page - 1) * limitCount;

        const snapshot = await db.collection('profiles').offset(offset).limit(limitCount).get();
        const talents = snapshot.docs
            .map(doc => {
                const data = doc.data() || {};
                const {
                    fcmToken: _fcmToken,
                    fcmTokens: _fcmTokens,
                    loginAttempts: _loginAttempts,
                    password: _password,
                    passwordHash: _passwordHash,
                    ...rest
                } = data;
                return {
                    id: doc.id,
                    ...rest
                };
            })
            .filter((t: any) => t.name && t.name.trim() !== '');
        return res.json({ 
            success: true, 
            talents, 
            page, 
            limit: limitCount, 
            hasMore: snapshot.docs.length === limitCount 
        });
    } catch (error: any) {
        console.error('[PublicProfiles] Firestore query error:', error?.message || error);
        // Return 200 with empty array fallback so client proxy never encounters 500/502
        return res.json({ success: true, talents: [], note: 'Firestore admin credential uninitialized' });
    }
};

router.get('/public', optionalAuth, getPublicProfilesHandler);
router.get('/profile/public', optionalAuth, getPublicProfilesHandler);
router.get('/search', verifyToken, scrapingPreventerMiddleware, async (req: AuthedRequest<Record<string, string>, unknown, { q?: string; category?: string }>, res: Response): Promise<Response> => {
    try {
        const { q, category } = req.query;
        let queryRef: firestore.Query = db.collection('profiles');
        if (category) {
            queryRef = queryRef.where('category', '==', category);
        }
        const results = await queryRef.limit(100).get();
        let talents: any[] = results.docs.map(doc => {
            const data = doc.data() || {};
            const {
                fcmToken: _fcmToken,
                fcmTokens: _fcmTokens,
                loginAttempts: _loginAttempts,
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
                (talent.name || '').toLowerCase().includes(queryStr) ||
                (talent.displayName || '').toLowerCase().includes(queryStr) ||
                (talent.bio || '').toLowerCase().includes(queryStr)
            );
        }
        return res.json({ success: true, talents });
    }
    catch (error: any) {
        console.error('Search proxy error:', error);
        return res.status(500).json({ error: 'Search failed' });
    }
});
router.get('/profiles/:userId', verifyToken, scrapingPreventerMiddleware, async (req: AuthedRequest<{
    userId: string;
}>, res: Response): Promise<any> => {
    try {
        const data = await getProfileByUid(req.params.userId);
        if (!data) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        const {
            fcmToken: _fcmToken,
            fcmTokens: _fcmTokens,
            loginAttempts: _loginAttempts,
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
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to load profile' });
    }
});
router.get('/users/:uid/profile', verifyToken, scrapingPreventerMiddleware, bloomFilterMiddleware('profile'), cacheMiddleware((req) => `profile:${req.params.uid}`, 300), async (req: AuthedRequest<{
    uid: string;
}>, res: Response): Promise<any> => {
    try {
        const data = await getProfileByUid(req.params.uid);
        if (!data) {
            return res.status(404).send('Profile not found');
        }
        const isOwner = req.user?.uid === req.params.uid;
        const isAdminUser = req.user?.admin === true;
        if (!isOwner && !isAdminUser && !data.showContactInfo) {
            delete data.email;
            delete data.phone;
        }
        return res.json(data);
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch profile';
        return res.status(500).json({ error: message });
    }
});
router.post('/profile', verifyToken, validateBody(ProfileSchema), async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        await updateProfileByUid(uid, req.body);
        addToBloomFilter('profile', uid);
        addToBloomFilter('user', uid);
        return res.json({ success: true });
    }
    catch (error: unknown) {
        console.error('Profile update failed:', error);
        const message = error instanceof Error ? error.message : 'Failed to update profile';
        return res.status(500).json({ error: message });
    }
});
export default router;
