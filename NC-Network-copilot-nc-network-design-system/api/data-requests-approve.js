// api/data-requests-approve.js
// Vercel serverless function: POST /api/data-requests/[requestId]/approve
// Replaces the Express backend endpoint so approval works on Vercel without a separate server.

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

// ─── Verify Firebase ID token & check admin claim ─────────────────────────
async function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) throw new Error('Unauthorized: No token');

  const auth = getAuth();
  const decoded = await auth.verifyIdToken(token);

  // Check Firestore isAdmin flag for double security
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.isAdmin !== true) {
    throw new Error('Forbidden: Not an admin');
  }
  return decoded;
}

module.exports = async (req, res) => {
  // Enable CORS
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

    // Extract requestId from URL path: /api/data-requests/[id]/approve
    const urlParts = req.url.split('/').filter(Boolean);
    // urlParts: ['data-requests', '{id}', 'approve'] or similar
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

    // Generate secure one-time download token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

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

    // Build download link
    const frontendUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://nc-netwotk.vercel.app';
    const downloadLink = `${frontendUrl}/api/data-export/download?token=${token}`;

    // Send approval email
    try {
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      if (emailUser && emailPass && emailPass !== 'your_gmail_app_password_here') {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: emailUser, pass: emailPass },
        });

        await transporter.sendMail({
          from: `"NC Network Security" <${emailUser}>`,
          to: userEmail,
          subject: 'Your Data Archive is Ready for Download',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #0b0b0c; color: #fff;">
              <h2 style="color: #FFD700;">NC Network</h2>
              <p style="color: #ccc;">Your request to download your account data has been approved.</p>
              <p style="color: #ccc;">You can download your archive by clicking the button below. This link is valid for <strong>24 hours</strong> and can only be used <strong>once</strong>.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadLink}" style="background-color: #00BFFF; color: #000; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
                  Download Data Archive
                </a>
              </div>
              <p style="color: #999; font-size: 11px;">
                If the button doesn't work, copy and paste this link:<br/>
                <a href="${downloadLink}" style="color: #00BFFF;">${downloadLink}</a>
              </p>
              <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;"/>
              <p style="color: #666; font-size: 11px;">If you did not request this data export, please contact support immediately.</p>
            </div>
          `,
        });
        console.log(`[Data Export] Email sent to ${userEmail}`);
        return res.status(200).json({ success: true, emailSent: true });
      } else {
        // Email not configured — still approve, just skip email
        console.warn('[Data Export] Email not configured. Approved without sending email.');
        return res.status(200).json({ success: true, emailSent: false, downloadLink });
      }
    } catch (emailError) {
      console.warn('[Data Export] Email failed but request approved:', emailError.message);
      return res.status(200).json({ success: true, emailSent: false, downloadLink });
    }
  } catch (error) {
    console.error('[Data Export Approve] Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

module.exports.config = {
  api: { bodyParser: true },
};
