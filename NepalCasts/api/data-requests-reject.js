



import admin from 'firebase-admin';
import * as jose from 'jose';

const JWKS = jose.createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawKey.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
  } else {
    admin.initializeApp({ projectId });
  }
}

async function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) throw Object.assign(new Error('Unauthorized: No token'), { status: 401 });
  
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const uid = payload.sub;
  
  if (payload.admin !== true) {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
      throw Object.assign(new Error('Forbidden: Not an admin'), { status: 403 });
    }
    
    try {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
    } catch (err) {
      console.error(`Failed to auto-set custom claim for user ${uid}:`, err);
    }
  }

  return {
    uid,
    email: payload.email || '',
    ...payload,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  try {
    initFirebaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: 'Initialization error' });
  }

  try {
    await verifyAdmin(req);
  } catch (authErr) {
    return res.status(authErr.status || 401).json({ error: authErr.message });
  }

  
  const requestId = req.query?.requestId;
  if (!requestId || typeof requestId !== 'string' || requestId.trim().length === 0 || requestId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(requestId)) {
    return res.status(400).json({ error: 'Invalid requestId parameter' });
  }

  
  const body = await new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });

  
  const reason = body?.reason;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 500) {
    return res.status(400).json({ error: 'Rejection reason is required (min 5, max 500 chars)' });
  }

  try {
    const db = admin.firestore();
    const requestRef = db.collection('data_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await requestRef.update({
      status: 'rejected',
      rejectionReason: reason.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to reject data request' });
  }
}

export const config = { api: { bodyParser: false } };
