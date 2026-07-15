import { Router, type Response, type Request, type NextFunction } from 'express';
import { db } from '../config';
import { strictAuthLimiter } from '../middleware/rateLimiter';
import type { AuthedRequest } from '../types';

const router = Router();

// POST /api/auth/resolve-phone
// Resolves a Nepali phone number to the associated account email,
// enabling phone-number-based login via the standard Firebase email/password flow.
router.post('/auth/resolve-phone', strictAuthLimiter, async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const normalizedPhone = phone.replace(/\s+/g, '');
    const digitsOnly = phone.replace(/\D/g, '');

    let querySnapshot = await db.collection('profiles')
      .where('phone', '==', normalizedPhone)
      .limit(1)
      .get();

    if (querySnapshot.empty && digitsOnly.length >= 7) {
      if (digitsOnly.length === 10 && (digitsOnly.startsWith('98') || digitsOnly.startsWith('97'))) {
        const withPrefix = `+977${digitsOnly}`;
        querySnapshot = await db.collection('profiles')
          .where('phone', '==', withPrefix)
          .limit(1)
          .get();
      }
    }

    if (querySnapshot.empty) {
      return res.status(444).json({ error: 'No user account found with this phone number.' });
    }

    const uid = querySnapshot.docs[0].id;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const email = userDoc.data()?.email;
    if (!email) {
      return res.status(404).json({ error: 'No email associated with this account.' });
    }

    return res.json({ success: true, email });
  } catch (error: any) {
    console.error('Resolve phone number error:', error);
    return res.status(500).json({ error: 'Internal server error resolving phone number.' });
  }
});

export default router;
