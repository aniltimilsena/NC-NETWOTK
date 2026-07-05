// api/data-requests-reject.js
// Vercel serverless function: POST /api/data-requests/[id]/reject

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

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
  if (!token) throw new Error('Unauthorized: No token');

  const auth = getAuth();
  const decoded = await auth.verifyIdToken(token);

  const db = getFirestore();
  const userDoc = await db.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
    throw new Error('Forbidden: Not an admin');
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

    try {
      await verifyAdmin(req);
    } catch (authErr) {
      return res.status(authErr.message.startsWith('Forbidden') ? 403 : 401).json({ error: authErr.message });
    }

    // Extract requestId from URL: /api/data-requests/[id]/reject
    const urlParts = req.url.split('/').filter(Boolean);
    const requestId = urlParts[urlParts.length - 2];

    if (!requestId || requestId === 'reject') {
      return res.status(400).json({ error: 'Missing requestId in URL' });
    }

    const reason = req.body?.reason;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({ error: 'Missing or invalid rejection reason' });
    }

    const db = getFirestore();
    const requestRef = db.collection('data_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    await requestRef.update({
      status: 'rejected',
      rejectionReason: reason.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Data Request Reject] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

module.exports.config = {
  api: { bodyParser: true },
};
