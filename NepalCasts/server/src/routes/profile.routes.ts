import { Router, type Response } from 'express';
import { verifyToken, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { ProfileSchema } from '../schemas';
import { db, admin } from '../config';
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
        const lastDocId = req.query.lastDocId as string | undefined;

        let queryRef: FirebaseFirestore.Query = db.collection('profiles').orderBy('createdAt', 'desc');

        if (lastDocId) {
            const lastDoc = await db.collection('profiles').doc(lastDocId).get();
            if (lastDoc.exists) {
                queryRef = queryRef.startAfter(lastDoc);
            }
        } else if (page > 1) {
            const offset = (page - 1) * limitCount;
            queryRef = queryRef.offset(offset);
        }

        const callerUid = req.user?.uid;
        const isCallerAdmin = req.user?.admin === true || req.user?.isAdmin === true;

        const snapshot = await queryRef.limit(limitCount).get();
        const talents = snapshot.docs
            .map(doc => {
                const data = doc.data() || {};
                const {
                    fcmToken: _fcmToken,
                    fcmTokens: _fcmTokens,
                    loginAttempts: _loginAttempts,
                    password: _password,
                    passwordHash: _passwordHash,
                    email,
                    phone,
                    contactEmail,
                    contactPhone,
                    showContactInfo,
                    ...rest
                } = data;
                const talent: any = {
                    id: doc.id,
                    ...rest,
                    showContactInfo: !!showContactInfo,
                };
                const isOwner = callerUid === doc.id;
                if (isOwner || isCallerAdmin || showContactInfo === true) {
                    if (email !== undefined) talent.email = email;
                    if (phone !== undefined) talent.phone = phone;
                    if (contactEmail !== undefined) talent.contactEmail = contactEmail;
                    if (contactPhone !== undefined) talent.contactPhone = contactPhone;
                }
                return talent;
            })
            .filter((t: any) => t.name && t.name.trim() !== '');

        const lastItem = snapshot.docs[snapshot.docs.length - 1];

        return res.json({ 
            success: true, 
            talents, 
            page, 
            limit: limitCount, 
            lastDocId: lastItem ? lastItem.id : null,
            hasMore: snapshot.docs.length === limitCount 
        });
    } catch (error: any) {
        console.error('[PublicProfiles] Firestore query error:', error?.message || error);
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
                contactEmail,
                contactPhone,
                showContactInfo,
                ...rest
            } = data;
            const isOwner = req.user?.uid === doc.id;
            const isAdminUser = req.user?.admin === true || req.user?.isAdmin === true;
            const talent: any = {
                id: doc.id,
                ...rest,
                showContactInfo: !!showContactInfo
            };
            if (isOwner || isAdminUser || showContactInfo === true) {
                if (email !== undefined) talent.email = email;
                if (phone !== undefined) talent.phone = phone;
                if (contactEmail !== undefined) talent.contactEmail = contactEmail;
                if (contactPhone !== undefined) talent.contactPhone = contactPhone;
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

router.post('/profile/follow', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const followerId = req.user?.uid;
        if (!followerId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { targetUserId, action, senderInfo } = req.body || {};
        if (!targetUserId || typeof targetUserId !== 'string' || targetUserId === followerId) {
            return res.status(400).json({ success: false, error: 'Invalid target user ID' });
        }

        const followId = `${followerId}_${targetUserId}`;
        const followRef = db.collection('follows').doc(followId);
        const notifId = `${followerId}_${targetUserId}_follow`;
        const notifRef = db.collection('notifications').doc(notifId);
        const targetProfileRef = db.collection('profiles').doc(targetUserId);
        const followerProfileRef = db.collection('profiles').doc(followerId);

        const isUnfollow = action === 'unfollow';

        await db.runTransaction(async (transaction) => {
            const followDoc = await transaction.get(followRef);
            if (isUnfollow) {
                if (followDoc.exists) {
                    transaction.delete(followRef);
                    transaction.delete(notifRef);
                    transaction.set(targetProfileRef, {
                        followers: admin.firestore.FieldValue.increment(-1),
                        followersCount: admin.firestore.FieldValue.increment(-1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    transaction.set(followerProfileRef, {
                        following: admin.firestore.FieldValue.increment(-1),
                        followingCount: admin.firestore.FieldValue.increment(-1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
            } else {
                if (!followDoc.exists) {
                    transaction.set(followRef, {
                        followerId,
                        followingId: targetUserId,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    transaction.set(notifRef, {
                        userId: targetUserId,
                        recipientId: targetUserId,
                        receiverId: targetUserId,
                        senderId: followerId,
                        senderName: senderInfo?.displayName || 'Someone',
                        senderAvatar: senderInfo?.photoURL || '',
                        title: 'New Connect',
                        body: `${senderInfo?.displayName || 'Someone'} connected with you.`,
                        type: 'follow',
                        notificationType: 'follow',
                        isRead: false,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        targetUrl: `/profile/${followerId}`,
                    }, { merge: true });
                    transaction.set(targetProfileRef, {
                        followers: admin.firestore.FieldValue.increment(1),
                        followersCount: admin.firestore.FieldValue.increment(1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    transaction.set(followerProfileRef, {
                        following: admin.firestore.FieldValue.increment(1),
                        followingCount: admin.firestore.FieldValue.increment(1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
            }
        });

        return res.json({ success: true, isFollowing: !isUnfollow });
    } catch (error: any) {
        console.error('Follow error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Follow action failed' });
    }
});

export default router;
