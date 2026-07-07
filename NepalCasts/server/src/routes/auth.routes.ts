import { Router, type Response, type Request } from 'express';
import bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';
import { verifyToken } from '../middleware/auth';
import { db } from '../config';
import {
  maskDestination,
  sendOTPEmail,
  sendOTPSMS
} from '../services/otp.service';
import type { AuthedRequest } from '../types';

const router = Router();

const verifyCredentials = async (email: string, password: string): Promise<boolean> => {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("VITE_FIREBASE_API_KEY environment variable is not defined");
    return false;
  }
  
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    return res.status === 200;
  } catch (error) {
    console.error("Credentials verification failed:", error);
    return false;
  }
};

// POST /api/2fa/send-setup-otp
router.post('/2fa/send-setup-otp', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }
    const { method, phone, email } = req.body as any; 

    const existingOTP = await db.collection('otpCodes').doc(userId).get();
    if (existingOTP.exists) {
      const existingData = existingOTP.data();
      if (existingData?.createdAt) {
        const timeSinceLastOTP = Date.now() - existingData.createdAt.toMillis();
        if (timeSinceLastOTP < 60 * 1000) { 
          return res.status(429).json({
            error: 'Please wait before requesting another code',
            waitSeconds: Math.ceil((60000 - timeSinceLastOTP) / 1000),
          });
        }
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await db.collection('otpCodes').doc(userId).set({
      hashedCode,
      method,
      phone: phone || null,
      email: email || null,
      expiresAt: Date.now() + 2 * 60 * 1000, 
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const targetEmail = email || userData.email || '';
    const targetPhone = phone || userData.phone || '';

    if (method === 'email') {
      await sendOTPEmail(targetEmail, code);
    } else if (method === 'sms') {
      await sendOTPSMS(targetPhone, code);
    }

    console.log(`[2FA OTP Setup] Method: ${method}, Destination: ${method === 'email' ? targetEmail : targetPhone}, OTP sent successfully`);

    return res.json({
      success: true,
      method,
      destination: maskDestination(method, targetPhone, targetEmail),
      expiresIn: 120, 
    });
  } catch (error: unknown) {
    console.error('Send setup OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send verification code';
    return res.status(500).json({ error: message });
  }
});

// POST /api/2fa/send-login-otp
router.post('/2fa/send-login-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, method } = req.body;

    const valid = await verifyCredentials(email, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    
    const privateSettingsDoc = await db.collection('users').doc(userId).collection('private').doc('settings').get();
    const privateSettingsData = privateSettingsDoc.data() || {};

    const twoFactorEnabled = userData.twoFactorEnabled || privateSettingsData.twoFactorEnabled;
    if (!twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled for this account' });
    }

    const twoFactorMethod = method || privateSettingsData.twoFactorMethod || userData.twoFactorMethod || 'sms';
    const targetEmail = privateSettingsData.twoFactorEmail || userData.email || email;
    const targetPhone = privateSettingsData.twoFactorPhone || userData.phone || '';

    const existingOTP = await db.collection('otpCodes').doc(userId).get();
    if (existingOTP.exists) {
      const existingData = existingOTP.data();
      if (existingData?.createdAt) {
        const timeSinceLastOTP = Date.now() - existingData.createdAt.toMillis();
        if (timeSinceLastOTP < 60 * 1000) { 
          return res.status(429).json({
            error: 'Please wait before requesting another code',
            waitSeconds: Math.ceil((60000 - timeSinceLastOTP) / 1000),
          });
        }
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await db.collection('otpCodes').doc(userId).set({
      hashedCode,
      method: twoFactorMethod,
      phone: targetPhone || null,
      email: targetEmail || null,
      expiresAt: Date.now() + 2 * 60 * 1000,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (twoFactorMethod === 'email') {
      await sendOTPEmail(targetEmail, code);
    } else {
      await sendOTPSMS(targetPhone, code);
    }

    console.log(`[2FA OTP Login] Method: ${twoFactorMethod}, Destination: ${twoFactorMethod === 'email' ? targetEmail : targetPhone}, OTP sent successfully`);

    return res.json({
      success: true,
      method: twoFactorMethod,
      destination: maskDestination(twoFactorMethod, targetPhone, targetEmail),
    });
  } catch (error: unknown) {
    console.error('Send login OTP error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send verification code';
    return res.status(500).json({ error: message });
  }
});

// POST /api/2fa/verify-otp
router.post('/2fa/verify-otp', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.uid;
    const { code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'Missing authentication or code' });
    }

    if (code.toString().length === 8) {
      const privateSettingsRef = db.collection('users').doc(userId).collection('private').doc('settings');
      const privateSettingsDoc = await privateSettingsRef.get();
      if (privateSettingsDoc.exists) {
        const backupCodes = privateSettingsDoc.data()?.twoFactorBackupCodes || [];
        if (backupCodes.includes(code.toString())) {
          const updatedBackupCodes = backupCodes.filter((c: string) => c !== code.toString());
          await privateSettingsRef.set({
            twoFactorBackupCodes: updatedBackupCodes
          }, { merge: true });

          await db.collection('two_factor_attempts').doc(userId).delete();

          const customToken = await admin.auth().createCustomToken(userId, {
            twoFactorVerified: true,
          });

          return res.json({
            success: true,
            verified: true,
            customToken,
          });
        }
      }
      return res.status(400).json({ error: 'Invalid backup code.' });
    }

    const otpDoc = await db.collection('otpCodes').doc(userId).get();
    if (!otpDoc.exists) {
      return res.status(400).json({ error: 'No verification code found. Request a new one.' });
    }

    const otpData = otpDoc.data() || {};

    if (Date.now() > otpData.expiresAt) {
      await db.collection('otpCodes').doc(userId).delete();
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    if (otpData.attempts >= 3) {
      await db.collection('otpCodes').doc(userId).delete();
      return res.status(429).json({
        error: 'Too many failed attempts. Please request a new code.',
      });
    }

    const isValid = await bcrypt.compare(code.toString(), otpData.hashedCode);
    if (!isValid) {
      await db.collection('otpCodes').doc(userId).update({
        attempts: otpData.attempts + 1,
      });
      const remaining = 2 - otpData.attempts;
      return res.status(400).json({
        error: `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    await db.collection('otpCodes').doc(userId).delete();

    const customToken = await admin.auth().createCustomToken(userId, {
      twoFactorVerified: true,
    });

    return res.json({
      success: true,
      verified: true,
      customToken, 
    });
  } catch (error: unknown) {
    console.error('Verify OTP error:', error);
    const message = error instanceof Error ? error.message : 'Verification failed';
    return res.status(500).json({ error: message });
  }
});

// POST /api/2fa/verify-setup-otp
router.post('/2fa/verify-setup-otp', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const { code, method, phone, email } = req.body as any;
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).send('Unauthorized');
    }

    const otpDoc = await db.collection('otpCodes').doc(uid).get();
    if (!otpDoc.exists) {
      return res.status(400).json({ error: 'No verification code found. Please request one.' });
    }

    const otpData = otpDoc.data() || {};
    const isExpired = Date.now() > otpData.expiresAt;
    const isValid = await bcrypt.compare(code.toString(), otpData.hashedCode);

    if (!isValid || isExpired) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const backupCodes = Array.from({ length: 8 }, () => 
      Math.floor(10000000 + Math.random() * 90000000).toString()
    );

    await db.collection('users').doc(uid).collection('private').doc('settings').set({
      twoFactorEnabled: true,
      twoFactorMethod: method,
      twoFactorPhone: phone || null,
      twoFactorEmail: email || null,
      twoFactorBackupCodes: backupCodes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('users').doc(uid).set({
      twoFactorEnabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('otpCodes').doc(uid).delete();

    return res.json({ success: true, backupCodes });
  } catch (error: unknown) {
    console.error('Verify setup OTP compatibility error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify setup OTP';
    return res.status(500).json({ error: message });
  }
});

// POST /api/2fa/verify-login-otp
router.post('/2fa/verify-login-otp', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password, code, useBackupCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const credentialsValid = await verifyCredentials(email, password);
    if (!credentialsValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    const attemptsDoc = await db.collection('two_factor_attempts').doc(uid).get();
    let currentAttempts = 0;
    if (attemptsDoc.exists) {
      const data = attemptsDoc.data();
      if (data?.lockedUntil && new Date() < data.lockedUntil.toDate()) {
        return res.status(403).json({ error: 'Account is locked. Try again later.' });
      }
      currentAttempts = data?.attempts || 0;
    }

    if (useBackupCode) {
      const privateSettingsRef = db.collection('users').doc(uid).collection('private').doc('settings');
      const privateSettingsDoc = await privateSettingsRef.get();
      const backupCodes = privateSettingsDoc.data()?.twoFactorBackupCodes || [];
      
      if (backupCodes.includes(code)) {
        const updatedBackupCodes = backupCodes.filter((c: string) => c !== code);
        await privateSettingsRef.set({
          twoFactorBackupCodes: updatedBackupCodes
        }, { merge: true });

        await db.collection('two_factor_attempts').doc(uid).delete();
        return res.json({ success: true });
      }
    } else {
      const otpDoc = await db.collection('otpCodes').doc(uid).get();
      if (otpDoc.exists) {
        const otpData = otpDoc.data() || {};
        const isExpired = Date.now() > otpData.expiresAt;
        const isValid = await bcrypt.compare(code.toString(), otpData.hashedCode);
        if (isValid && !isExpired) {
          await db.collection('otpCodes').doc(uid).delete();
          await db.collection('two_factor_attempts').doc(uid).delete();
          return res.json({ success: true });
        }
      }
    }

    currentAttempts += 1;
    if (currentAttempts >= 3) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); 
      await db.collection('two_factor_attempts').doc(uid).set({
        attempts: currentAttempts,
        lockedUntil,
      });
      return res.status(400).json({ error: 'Invalid code. Too many failed attempts. Account locked for 15 minutes.' });
    } else {
      await db.collection('two_factor_attempts').doc(uid).set({
        attempts: currentAttempts,
        lockedUntil: null,
      });
      return res.status(400).json({ error: `Invalid code. ${3 - currentAttempts} attempts remaining.` });
    }
  } catch (error: unknown) {
    console.error('Verify login OTP compatibility error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify login OTP';
    return res.status(500).json({ error: message });
  }
});

// POST /api/2fa/enable
router.post('/2fa/enable', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }
    const { method, verificationCode } = req.body as any;

    const otpDoc = await db.collection('otpCodes').doc(userId).get();
    if (!otpDoc.exists) {
      return res.status(400).json({ error: 'No pending verification found' });
    }

    const otpData = otpDoc.data() || {};
    if (Date.now() > otpData.expiresAt) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const isValid = await bcrypt.compare(
      verificationCode.toString(),
      otpData.hashedCode
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await db.collection('otpCodes').doc(userId).delete();

    await db.collection('users').doc(userId).collection('private').doc('settings').set({
      twoFactorEnabled: true,
      twoFactorMethod: method,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('users').doc(userId).set({
      twoFactorEnabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error: unknown) {
    console.error('Enable 2FA error:', error);
    const message = error instanceof Error ? error.message : 'Failed to enable 2FA';
    return res.status(500).json({ error: message });
  }
});

// POST /api/2fa/disable
router.post('/2fa/disable', verifyToken, async (req: AuthedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    await db.collection('users').doc(userId).collection('private').doc('settings').set({
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorPhone: null,
      twoFactorEmail: null,
      twoFactorBackupCodes: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('users').doc(userId).set({
      twoFactorEnabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.json({ success: true, message: '2FA disabled' });
  } catch (error: unknown) {
    console.error('Disable 2FA error:', error);
    const message = error instanceof Error ? error.message : 'Failed to disable 2FA';
    return res.status(500).json({ error: message });
  }
});

// POST /api/auth/resolve-phone
router.post('/auth/resolve-phone', async (req: Request, res: Response): Promise<any> => {
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
