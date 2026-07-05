// api/data-requests-approve.js
// Reads requestId from req.query.requestId (set by vercel.json rewrite)

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');

function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'nc-network-10d0b';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawKey.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    initializeApp({ projectId });
  }
}

async function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) throw Object.assign(new Error('Unauthorized: No token'), { status: 401 });
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(token);
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
    throw Object.assign(new Error('Forbidden: Not an admin'), { status: 403 });
  }
  return decoded;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    initFirebaseAdmin();
  } catch (e) {
    return res.status(500).json({ error: 'Firebase init failed: ' + e.message });
  }

  try {
    await verifyAdmin(req);
  } catch (authErr) {
    return res.status(authErr.status || 401).json({ error: authErr.message });
  }

  // Read requestId from query param (injected by vercel.json rewrite)
  const requestId = req.query?.requestId;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  try {
    const db = getFirestore();
    const requestRef = db.collection('data_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    // Generate secure one-time download token (24h)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const userId = requestData.userId || requestData.uid;
    const userEmail = requestData.userEmail || requestData.email;

    await db.collection('one_time_tokens').doc(token).set({
      uid: userId,
      email: userEmail,
      requestId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
    });

    await requestRef.update({
      status: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
    });

    const host = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.FRONTEND_URL || 'https://nc-netwotk.vercel.app');
    const downloadLink = `${host}/api/data-export/download?token=${token}`;

    return res.status(200).json({ success: true, downloadLink, expiresAt });

  } catch (error) {
    console.error('[data-requests-approve] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.config = { api: { bodyParser: true } };
