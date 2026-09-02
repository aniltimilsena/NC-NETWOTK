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
        if (!castingDoc.exists) {
            return res.status(404).json({ error: 'Casting call not found' });
        }
        return res.json({ casting: castingDoc.data() });
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
            if (existingDoc.exists && existingDoc.data()?.createdBy !== uid && existingDoc.data()?.creatorId !== uid) {
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
router.delete('/casting/:id', verifyToken, isAdmin, async (req: AuthedRequest<{
    id: string;
}>, res: Response): Promise<any> => {
    try {
        await db.collection('casting_calls').doc(req.params.id).delete();
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
export default router;
