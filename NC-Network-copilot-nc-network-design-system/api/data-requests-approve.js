// api/data-requests-approve.js
// Vercel serverless function: POST /api/data-requests/[requestId]/approve
// Approves a data request and returns a secure one-time download link directly.
// No email is sent — the download link is shown to the admin in the UI.

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');

// ─── Firebase Admin Init (idempotent) ──────────────────────────────────────
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

// ─── Verify Firebase ID token & check admin Firestore flag ─────────────────
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    initFirebaseAdmin();

    // Verify admin
    try {
      await verifyAdmin(req);
    } catch (authErr) {
      return res.status(authErr.message.startsWith('Forbidden') ? 403 : 401).json({ error: authErr.message });
    }

    // Extract requestId from URL: /api/data-requests/[id]/approve
    const urlParts = req.url.split('/').filter(Boolean);
    const requestId = urlParts[urlParts.length - 2];

    if (!requestId || requestId === 'approve') {
      return res.status(400).json({ error: 'Missing requestId in URL' });
    }

    const db = getFirestore();
    const requestRef = db.collection('data_requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not in pending status' });
    }

    // Generate secure one-time download token (valid 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    const userId = requestData.userId || requestData.uid;
    const userEmail = requestData.userEmail || requestData.email;

    // Store token in Firestore
    await db.collection('one_time_tokens').doc(token).set({
      uid: userId,
      email: userEmail,
      requestId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
    });

    // Mark request as approved
    await requestRef.update({
      status: 'approved',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Build the download link
    const host = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.FRONTEND_URL || 'https://nc-netwotk.vercel.app');
    const downloadLink = `${host}/api/data-export/download?token=${token}`;

    // Return the download link directly to the admin UI — no email needed
    return res.status(200).json({
      success: true,
      downloadLink,
      expiresAt,
    });

  } catch (error) {
    console.error('[Data Export Approve] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

module.exports.config = {
  api: { bodyParser: true },
};
