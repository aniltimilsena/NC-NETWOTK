import { Router, type Response, type Request } from 'express';
import { verifyToken, isAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { CastingCallSchema } from '../schemas';
import { db, admin } from '../config';
import { bloomFilterMiddleware, cacheMiddleware, scrapingPreventerMiddleware } from '../middleware/cacheProtection';
import { publicApiLimiter } from '../middleware/rateLimiter';
import { addToBloomFilter, deleteFromCacheByPattern } from '../services/cacheService';
import type { AuthedRequest } from '../types';
const router = Router();
router.get('/casting', verifyToken, publicApiLimiter, scrapingPreventerMiddleware, async (req: Request, res: Response): Promise<any> => {
    try {
        const filter = req.query.filter as string | undefined;
        const limitVal = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 50;
        const lastDocId = req.query.lastDocId as string | undefined;
        let castingQuery = db.collection('casting_calls').orderBy('createdAt', 'desc');
        if (filter && filter !== 'All' && filter !== 'Saved') {
            castingQuery = castingQuery.where('type', '==', filter);
        }
        if (lastDocId) {
            const lastDoc = await db.collection('casting_calls').doc(lastDocId).get();
            if (lastDoc.exists) {
                castingQuery = castingQuery.startAfter(lastDoc);
            }
        }
        castingQuery = castingQuery.limit(limitVal);
        const snapshot = await castingQuery.get();
        const calls = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return res.json(calls);
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch casting calls';
        return res.status(500).json({ error: message });
    }
});
router.get('/castings/:id', verifyToken, scrapingPreventerMiddleware, bloomFilterMiddleware('casting'), cacheMiddleware((req) => `casting:${req.params.id}`, 600), async (req: Request<{
    id: string;
}>, res: Response): Promise<any> => {
    try {
        const castingDoc = await db
            .collection('casting_calls')
            .doc(req.params.id)
            .get();
        const castingData = castingDoc.data() || {};
        const creatorId = castingData.createdBy || castingData.creatorId || castingData.created_by || castingData.user_id;
        let creatorProfile: Record<string, any> | null = null;
        if (creatorId) {
            let profileSnap = await db.collection('profiles').doc(creatorId).get();
            if (profileSnap.exists && (profileSnap.data()?.linkedUid || profileSnap.data()?.canonicalUid)) {
                const targetId = profileSnap.data()?.linkedUid || profileSnap.data()?.canonicalUid;
                const canonicalSnap = await db.collection('profiles').doc(targetId).get();
                if (canonicalSnap.exists) {
                    profileSnap = canonicalSnap;
                }
            }
            if (profileSnap.exists) {
                const pData = profileSnap.data() || {};
                const userSnap = await db.collection('users').doc(profileSnap.id).get();
                const uData = userSnap.exists ? userSnap.data() || {} : {};
                creatorProfile = {
                    id: profileSnap.id,
                    uid: profileSnap.id,
                    ...uData,
                    ...pData,
                };
            } else {
                const userSnap = await db.collection('users').doc(creatorId).get();
                if (userSnap.exists) {
                    creatorProfile = {
                        id: userSnap.id,
                        uid: userSnap.id,
                        ...userSnap.data(),
                    };
                }
            }
        }

        return res.json({
            casting: {
                id: castingDoc.id,
                ...castingData,
                postedBy: creatorProfile,
                creator: creatorProfile,
            }
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});
router.get('/discovery', verifyToken, scrapingPreventerMiddleware, cacheMiddleware((req) => `discovery:${req.query.category || 'all'}:${req.query.page || '1'}`, 120), async (req, res): Promise<any> => {
    try {
        const limitVal = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10), 100) : 20;
        const snapshot = await db.collection('casting_calls')
            .orderBy('createdAt', 'desc')
            .limit(limitVal)
            .get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.json({ items });
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});
router.post('/casting', verifyToken, validateBody(CastingCallSchema), async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).send('Unauthorized');
        }
        const { id, ...dataToSave } = req.body as any;
        if (id) {
            const existingDoc = await db.collection('casting_calls').doc(id).get();
            const isOwner = existingDoc.exists && (existingDoc.data()?.createdBy === uid || existingDoc.data()?.creatorId === uid);
            const isUserAdmin = req.user?.admin === true || req.user?.isAdmin === true;
            if (existingDoc.exists && !isOwner && !isUserAdmin) {
                return res.status(403).json({ error: 'Forbidden: You do not own this casting call' });
            }
            await db.collection('casting_calls').doc(id).update({
                ...dataToSave,
                createdBy: existingDoc.data()?.createdBy || uid,
                creatorId: existingDoc.data()?.creatorId || uid,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            addToBloomFilter('casting', id);
            deleteFromCacheByPattern(`casting:${id}`);
            return res.json({ id });
        }
        else {
            const docRef = await db.collection('casting_calls').add({
                ...dataToSave,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: uid,
                creatorId: uid,
                status: 'Open',
            });
            addToBloomFilter('casting', docRef.id);
            return res.json({ id: docRef.id });
        }
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create casting call';
        return res.status(500).json({ error: message });
    }
});
router.delete('/casting/:id', verifyToken, async (req: AuthedRequest<{
    id: string;
}>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const docRef = db.collection('casting_calls').doc(req.params.id);
        const existingDoc = await docRef.get();
        if (!existingDoc.exists) {
            return res.status(404).json({ error: 'Casting call not found' });
        }
        const data = existingDoc.data() || {};
        const isOwner = Boolean(
            data.createdBy === uid ||
            data.creatorId === uid ||
            data.created_by === uid ||
            data.user_id === uid ||
            (req.user?.email && data.creatorEmail && req.user.email.toLowerCase() === data.creatorEmail.toLowerCase())
        );
        const isUserAdmin = req.user?.isAdmin === true || req.user?.admin === true || req.user?.role?.toLowerCase() === 'admin';
        if (!isOwner && !isUserAdmin) {
            return res.status(403).json({ error: 'Forbidden: Only the creator of this casting call can delete it' });
        }
        await docRef.delete();
        deleteFromCacheByPattern(`casting:${req.params.id}`);
        return res.json({ success: true });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete casting call';
        return res.status(500).json({ error: message });
    }
});
router.put('/casting/:id/priority', verifyToken, isAdmin, async (req: AuthedRequest<{
    id: string;
}>, res: Response): Promise<any> => {
    try {
        const { highPriority } = req.body as any;
        await db.collection('casting_calls').doc(req.params.id).update({
            highPriority: !!highPriority,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        deleteFromCacheByPattern(`casting:${req.params.id}`);
        return res.json({ success: true });
    }
    catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to set casting priority';
        return res.status(500).json({ error: message });
    }
});

router.post('/casting/:id/apply', verifyToken, async (req: AuthedRequest<{ id: string }>, res: Response): Promise<any> => {
    try {
        const applicantUid = req.user?.uid;
        if (!applicantUid) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
        }

        const castingId = req.params.id;
        const callDoc = await db.collection('casting_calls').doc(castingId).get();
        if (!callDoc.exists) {
            return res.status(404).json({ success: false, error: 'Casting call not found' });
        }
        const callData = callDoc.data() || {};
        const creatorId = callData.creatorId || callData.createdBy;

        const body = req.body || {};
        const roleApplied = body.roleName || body.role || callData.roles?.[0]?.name || callData.category || 'General Role';

        // Check for existing application to avoid duplicate submissions
        const existingQuery = await db.collection('applications')
            .where('castingId', '==', castingId)
            .where('userId', '==', applicantUid)
            .limit(1)
            .get();

        if (!existingQuery.empty) {
            const existingId = existingQuery.docs[0].id;
            return res.json({ success: true, id: existingId, message: 'Already applied' });
        }

        const appData = {
            castingId,
            castingTitle: callData.title || 'Casting Call',
            userId: applicantUid,
            user_id: applicantUid,
            userName: body.userName || body.fullName || req.user?.name || 'Anonymous Actor',
            fullName: body.fullName || body.userName || req.user?.name || 'Anonymous Actor',
            userEmail: body.userEmail || body.contactEmail || req.user?.email || '',
            contactEmail: body.contactEmail || body.userEmail || req.user?.email || '',
            userPhone: body.userPhone || body.contactPhone || '',
            contactPhone: body.contactPhone || body.userPhone || '',
            phone: body.phone || body.contactPhone || '',
            age: body.age || '',
            gender: body.gender || '',
            experience: body.experience || '',
            userPhoto: body.userPhoto || req.user?.picture || '',
            roleName: roleApplied,
            selfTapeUrl: body.selfTapeUrl || '',
            coverNote: body.coverNote || '',
            fileName: body.fileName || null,
            fileUrl: body.fileUrl || body.attachmentUrl || null,
            attachmentUrl: body.attachmentUrl || body.fileUrl || null,
            portfolioUrl: body.portfolioUrl || body.selfTapeUrl || body.fileUrl || '',
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            creatorId: creatorId || '',
            createdBy: creatorId || '',
        };

        const appRef = await db.collection('applications').add(appData);

        // Notify the creator if not self-applying
        if (creatorId && creatorId !== applicantUid) {
            const notifId = `${applicantUid}_${castingId}_${appRef.id}_application`;
            const actorName = appData.userName;
            await db.collection('notifications').doc(notifId).set({
                userId: creatorId,
                recipientId: creatorId,
                receiverId: creatorId,
                senderId: applicantUid,
                senderName: actorName,
                senderAvatar: appData.userPhoto,
                type: 'casting',
                notificationType: 'casting',
                title: callData.title || 'Casting Call',
                body: `${actorName} applied to your casting call: "${callData.title || 'Audition'}" for role "${roleApplied}"`,
                message: `${actorName} applied to your casting call: "${callData.title || 'Audition'}" for role "${roleApplied}"`,
                targetUrl: `/casting/${castingId}`,
                link: `/casting/${castingId}`,
                profileUrl: `/profile/${applicantUid}`,
                castingId,
                roleName: roleApplied,
                read: false,
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            // Create messaging thread
            const convoId = `app_${appRef.id}`;
            const applicationMsgText = `Audition Application for "${roleApplied}" on "${callData.title || 'Casting Call'}"${body.coverNote ? `\n\nCover Note: "${body.coverNote}"` : ''}`;
            await db.collection('conversations').doc(convoId).set({
                participants: [applicantUid, creatorId].sort(),
                type: 'application',
                isApplication: true,
                applicationId: appRef.id,
                castingId,
                castingTitle: callData.title || 'Casting Call',
                roleName: roleApplied,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastMessage: applicationMsgText,
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                unread: true,
                lastSenderId: applicantUid,
            }, { merge: true });

            await db.collection('conversations').doc(convoId).collection('messages').add({
                senderId: applicantUid,
                text: applicationMsgText,
                type: 'text',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
        }

        return res.json({ success: true, id: appRef.id });
    } catch (error: any) {
        console.error('Apply to casting call error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to submit application' });
    }
});

router.delete('/casting/applications/:appId', verifyToken, async (req: AuthedRequest<{ appId: string }>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const appRef = db.collection('applications').doc(req.params.appId);
        const appDoc = await appRef.get();
        if (!appDoc.exists) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const appData = appDoc.data() || {};
        const isApplicant = appData.userId === uid || appData.user_id === uid;
        const isCreator = appData.creatorId === uid || appData.createdBy === uid;
        const isUserAdmin = req.user?.admin === true || req.user?.isAdmin === true;

        if (!isApplicant && !isCreator && !isUserAdmin) {
            return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to delete this application' });
        }

        await appRef.delete();
        return res.json({ success: true });
    } catch (error: any) {
        console.error('Delete application error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete application' });
    }
});

router.put('/casting/applications/:appId/status', verifyToken, async (req: AuthedRequest<{ appId: string }>, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { status } = req.body || {};
        const validStatuses = ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid application status' });
        }

        const appRef = db.collection('applications').doc(req.params.appId);
        const appDoc = await appRef.get();
        if (!appDoc.exists) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }

        const appData = appDoc.data() || {};
        const isCreator = appData.creatorId === uid || appData.createdBy === uid;
        const isUserAdmin = req.user?.admin === true || req.user?.isAdmin === true;

        if (!isCreator && !isUserAdmin) {
            return res.status(403).json({ success: false, error: 'Forbidden: Only the casting creator or admin can update application status' });
        }

        await appRef.update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify applicant of status change
        const applicantId = appData.userId || appData.user_id;
        if (applicantId && applicantId !== uid) {
            const notifId = `${uid}_${req.params.appId}_${status}_status`;
            const senderName = req.user?.name || 'Casting Director';
            let statusMsg = `${senderName} updated your application status to "${status}".`;
            if (status === 'accepted') statusMsg = `${senderName} accepted your audition application!`;
            if (status === 'shortlisted') statusMsg = `${senderName} shortlisted your audition application.`;
            if (status === 'rejected') statusMsg = `${senderName} reviewed your audition application.`;

            await db.collection('notifications').doc(notifId).set({
                userId: applicantId,
                recipientId: applicantId,
                receiverId: applicantId,
                senderId: uid,
                senderName,
                senderAvatar: req.user?.picture || '',
                type: 'casting',
                notificationType: 'casting',
                title: appData.castingTitle || 'Audition Application',
                body: statusMsg,
                message: statusMsg,
                targetUrl: `/applications`,
                link: `/applications`,
                read: false,
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        return res.json({ success: true, status });
    } catch (error: any) {
        console.error('Update application status error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to update status' });
    }
});

export default router;
