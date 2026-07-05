// api/admin-users.js
// Vercel serverless function handling all admin user management operations:
//   POST /api/admin/users/:userId/delete
//   POST /api/admin/users/:userId/ban
//   POST /api/admin/users/:userId/unban
//   POST /api/admin/log

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// ─── Firebase Admin Init (idempotent) ──────────────────────────────────────
function initFirebaseAdmin() {
  if (getApps().length > 0) return;
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    'nc-network-10d0b';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawKey.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    initializeApp({ projectId });
  }
}

// ─── Verify Firebase ID token + admin Firestore flag ──────────────────────
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

// ─── Parse JSON body ───────────────────────────────────────────────────────
async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// ─── Batch delete Firestore documents ─────────────────────────────────────
async function batchDelete(db, snap) {
  if (snap.empty) return;
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count === 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    initFirebaseAdmin();
  } catch (initErr) {
    console.error('[admin-users] Firebase init error:', initErr);
    return res.status(500).json({ error: 'Firebase initialization failed' });
  }

  // Verify admin
  let adminUser;
  try {
    adminUser = await verifyAdmin(req);
  } catch (authErr) {
    return res.status(authErr.status || 401).json({ error: authErr.message });
  }

  const db = getFirestore();
  const auth = getAuth();
  const adminUid = adminUser.uid;
  const adminEmail = adminUser.email || 'Unknown Admin';

  // Determine action from URL path
  // URL patterns (after /api prefix stripped by Vercel):
  //   /admin/users/:userId/delete
  //   /admin/users/:userId/ban
  //   /admin/users/:userId/unban
  //   /admin/log
  const urlPath = req.url || '';
  const parts = urlPath.replace(/^\//, '').split('/');
  // parts[0] = 'admin', parts[1] = 'users' | 'log', parts[2] = userId, parts[3] = action
  const section = parts[1]; // 'users' or 'log'

  // ── POST /api/admin/log ──────────────────────────────────────────────────
  if (section === 'log') {
    const body = await readBody(req);
    const { action, targetId, details } = body;
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'action is required' });
    }
    try {
      await db.collection('admin_logs').add({
        adminEmail,
        action: String(action).slice(0, 200),
        targetId: targetId || null,
        details: details || {},
        timestamp: FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admin-users] log error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── /api/admin/users/:userId/(delete|ban|unban) ──────────────────────────
  const userId = parts[2];
  const action = parts[3]; // 'delete' | 'ban' | 'unban'

  if (!userId) return res.status(400).json({ error: 'User ID is required' });
  if (!['delete', 'ban', 'unban'].includes(action)) {
    return res.status(404).json({ error: `Unknown action: ${action}` });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (action === 'delete') {
    try {
      // 1. Revoke refresh tokens
      try { await auth.revokeRefreshTokens(userId); } catch {}

      // 2. Delete from Firebase Auth
      try { await auth.deleteUser(userId); } catch {}

      // 3. Delete sessions subcollection
      try {
        const sessionsSnap = await db.collection('profiles').doc(userId).collection('sessions').get();
        await batchDelete(db, sessionsSnap);
      } catch {}

      // 4. Delete main documents
      await db.collection('users').doc(userId).delete();
      await db.collection('profiles').doc(userId).delete();

      // 5. Clean up related collections
      const collectionsToClean = [
        { name: 'casting_calls',  field: 'createdBy' },
        { name: 'saved_calls',    field: 'userId' },
        { name: 'data_requests',  field: 'userId' },
        { name: 'follows',        field: 'followerId' },
        { name: 'follows',        field: 'followingId' },
        { name: 'applications',   field: 'userId' },
        { name: 'applications',   field: 'creatorId' },
        { name: 'notifications',  field: 'userId' },
        { name: 'notifications',  field: 'recipientId' },
        { name: 'notifications',  field: 'receiverId' },
        { name: 'notifications',  field: 'senderId' },
        { name: 'reviews',        field: 'reviewerId' },
        { name: 'reviews',        field: 'targetUserId' },
        { name: 'reviews',        field: 'targetUid' },
      ];
      for (const col of collectionsToClean) {
        try {
          const snap = await db.collection(col.name).where(col.field, '==', userId).get();
          await batchDelete(db, snap);
        } catch {}
      }

      // 6. Log deletion
      await db.collection('deleted_users').add({
        userId,
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: adminUid,
      });
      await db.collection('admin_logs').add({
        adminEmail,
        action: 'Delete User Account',
        targetId: userId,
        details: { deletedByAdminUid: adminUid },
        timestamp: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admin-users] delete error:', err);
      return res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
  }

  // ── BAN ──────────────────────────────────────────────────────────────────
  if (action === 'ban') {
    const body = await readBody(req);
    const { reason, duration } = body;

    try {
      // 1. Revoke tokens & disable account
      try { await auth.revokeRefreshTokens(userId); } catch {}
      try { await auth.updateUser(userId, { disabled: true }); } catch {}

      // 2. Calculate expiry
      let banExpiresAt = null;
      if (duration && duration !== 'permanent') {
        const days = { '1d': 1, '7d': 7, '30d': 30 }[duration];
        if (days) {
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + days);
          const { Timestamp } = require('firebase-admin/firestore');
          banExpiresAt = Timestamp.fromDate(expiry);
        }
      }

      const updateFields = {
        status: 'banned',
        bannedAt: FieldValue.serverTimestamp(),
        bannedBy: adminUid,
        banReason: reason || 'No reason provided',
        banExpiresAt,
      };

      await db.collection('users').doc(userId).update(updateFields);
      try { await db.collection('profiles').doc(userId).update(updateFields); } catch {}

      // 3. Log moderation action
      await db.collection('moderation_log').add({
        action: 'ban',
        userId,
        reason: reason || 'No reason provided',
        duration: duration || 'permanent',
        moderatorId: adminUid,
        timestamp: FieldValue.serverTimestamp(),
      });
      await db.collection('admin_logs').add({
        adminEmail,
        action: 'Ban User Account',
        targetId: userId,
        details: { reason, duration, bannedByAdminUid: adminUid },
        timestamp: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admin-users] ban error:', err);
      return res.status(500).json({ error: err.message || 'Failed to ban user' });
    }
  }

  // ── UNBAN ────────────────────────────────────────────────────────────────
  if (action === 'unban') {
    try {
      // 1. Re-enable Auth account
      try { await auth.updateUser(userId, { disabled: false }); } catch {}

      // 2. Remove ban fields in Firestore
      const removeFields = {
        status: 'Active',
        bannedAt: FieldValue.delete(),
        bannedBy: FieldValue.delete(),
        banReason: FieldValue.delete(),
        banExpiresAt: FieldValue.delete(),
      };

      await db.collection('users').doc(userId).update(removeFields);
      try { await db.collection('profiles').doc(userId).update(removeFields); } catch {}

      // 3. Log moderation action
      await db.collection('moderation_log').add({
        action: 'unban',
        userId,
        moderatorId: adminUid,
        timestamp: FieldValue.serverTimestamp(),
      });
      await db.collection('admin_logs').add({
        adminEmail,
        action: 'Unban User Account',
        targetId: userId,
        details: { unbannedByAdminUid: adminUid },
        timestamp: FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[admin-users] unban error:', err);
      return res.status(500).json({ error: err.message || 'Failed to unban user' });
    }
  }
};

module.exports.config = {
  api: { bodyParser: false },
};
