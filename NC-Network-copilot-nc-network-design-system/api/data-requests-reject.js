// api/data-requests-reject.js
// Reads requestId from req.query.requestId (set by vercel.json rewrite)

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

  // Read body
  const body = await new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });

  const reason = body?.reason;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Rejection reason is required (min 5 chars)' });
  }

  try {
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
    console.error('[data-requests-reject] Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.config = { api: { bodyParser: false } };
