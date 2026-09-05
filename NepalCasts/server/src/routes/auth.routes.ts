import { Router, type Response } from 'express';
import { admin } from '../config';
import { verifyToken } from '../middleware/auth';
import type { AuthedRequest } from '../types';

const router = Router();

router.post('/auth/firebase-token', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            return res.status(401).json({ success: false, error: 'Unauthorized: missing user uid' });
        }
        try {
            const customToken = await admin.auth().createCustomToken(uid, {
                email: req.user?.email || '',
                admin: req.user?.isAdmin === true || req.user?.role?.toLowerCase() === 'admin',
            });
            return res.json({ success: true, token: customToken });
        } catch (mintErr: any) {
            console.warn('[Firebase Token] Cannot mint custom token without service account credentials:', mintErr?.message || mintErr);
            return res.json({
                success: false,
                token: null,
                message: 'Custom token minting requires service account credentials',
            });
        }
    } catch (err: any) {
        return res.json({ success: false, token: null, error: 'Internal token handler error' });
    }
});

export default router;
