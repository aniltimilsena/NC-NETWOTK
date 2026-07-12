import { db, admin } from '../config';
import { deleteFromCacheByPattern } from './cacheService';

export const getProfileByUid = async (uid: string): Promise<any> => {
  const profileDoc = await db.collection('profiles').doc(uid).get();
  if (!profileDoc.exists) return null;
  return profileDoc.data();
};

export const updateProfileByUid = async (uid: string, validatedData: any): Promise<void> => {
  await db.collection('profiles').doc(uid).set({
    ...validatedData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const userUpdate: Record<string, any> = {};
  if (validatedData.name !== undefined) userUpdate.name = validatedData.name;
  if (validatedData.role !== undefined) userUpdate.role = validatedData.role;
  if (validatedData.gender !== undefined) userUpdate.gender = validatedData.gender;

  if (Object.keys(userUpdate).length > 0) {
    await db.collection('users').doc(uid).set(userUpdate, { merge: true });
  }

  deleteFromCacheByPattern(`profile:${uid}`);
  deleteFromCacheByPattern(`user:${uid}`);
};

export const getAllProfiles = async (): Promise<any[]> => {
  const snapshot = await db.collection('profiles').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const updateUserRole = async (userId: string, makeAdmin: boolean, adminUid: string): Promise<string> => {
  const nextRole = makeAdmin ? 'Admin' : 'Talent';

  const batch = db.batch();
  batch.update(db.collection('users').doc(userId), { isAdmin: makeAdmin, role: nextRole });
  batch.update(db.collection('profiles').doc(userId), { isAdmin: makeAdmin, role: nextRole });
  await batch.commit();

  await db.collection('admin_logs').add({
    action: 'Update User Role',
    performedBy: adminUid,
    targetUser: userId,
    details: makeAdmin ? 'Promoted to Admin' : 'Demoted to Talent',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return nextRole;
};

export const deleteUserAccount = async (userId: string, adminUid: string, adminEmail: string): Promise<void> => {
  try {
    await admin.auth().revokeRefreshTokens(userId);
  } catch (revokeErr) {
    console.warn(`Could not revoke refresh tokens for user ${userId}:`, revokeErr);
  }

  try {
    await admin.auth().deleteUser(userId);
  } catch (authErr) {
    console.warn(`Could not delete Auth user ${userId}:`, authErr);
  }

  try {
    const sessionsSnap = await db.collection('profiles').doc(userId).collection('sessions').get();
    if (!sessionsSnap.empty) {
      let batch = db.batch();
      let count = 0;
      for (const doc of sessionsSnap.docs) {
        batch.delete(doc.ref);
        count++;
        if (count === 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }
  } catch (sessionsErr) {
    console.warn(`Error deleting sessions for user ${userId}:`, sessionsErr);
  }

  await db.collection('users').doc(userId).delete();
  await db.collection('profiles').doc(userId).delete();

  const collectionsToClean = [
    { name: 'casting_calls', field: 'createdBy' },
    { name: 'saved_calls', field: 'userId' },
    { name: 'data_requests', field: 'userId' },
    { name: 'follows', field: 'followerId' },
    { name: 'follows', field: 'followingId' },
    { name: 'applications', field: 'userId' },
    { name: 'applications', field: 'creatorId' },
    { name: 'notifications', field: 'userId' },
    { name: 'notifications', field: 'recipientId' },
    { name: 'notifications', field: 'receiverId' },
    { name: 'notifications', field: 'senderId' },
    { name: 'reviews', field: 'reviewerId' },
    { name: 'reviews', field: 'targetUserId' },
    { name: 'reviews', field: 'targetUid' },
    { name: 'reports', field: 'reporterId' },
    { name: 'reports', field: 'targetUserId' }
  ];

  for (const col of collectionsToClean) {
    try {
      const snap = await db.collection(col.name).where(col.field, '==', userId).get();
      if (!snap.empty) {
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
        if (count > 0) {
          await batch.commit();
        }
      }
    } catch (colErr) {
      console.warn(`Error cleaning up collection ${col.name} (field ${col.field}) for user ${userId}:`, colErr);
    }
  }

  await db.collection('deleted_users').add({
    userId,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedBy: adminUid,
  });

  await db.collection('admin_logs').add({
    adminEmail,
    action: 'Delete User Account',
    targetId: userId,
    details: { deletedByAdminUid: adminUid },
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  deleteFromCacheByPattern(`profile:${userId}`);
  deleteFromCacheByPattern(`user:${userId}`);
};

export const banUserAccount = async (
  userId: string,
  adminUid: string,
  adminEmail: string,
  reason: string,
  duration: string
): Promise<void> => {
  try {
    await admin.auth().revokeRefreshTokens(userId);
  } catch (revokeErr) {
    console.warn(`Could not revoke refresh tokens for user ${userId}:`, revokeErr);
  }

  try {
    await admin.auth().updateUser(userId, { disabled: true });
  } catch (authErr) {
    console.warn(`Could not disable Auth user ${userId}:`, authErr);
  }

  const calculateExpiryDate = (dur: string) => {
    const now = new Date();
    const map: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30 };
    const days = map[dur];
    if (!days) return null;
    now.setDate(now.getDate() + days);
    return admin.firestore.Timestamp.fromDate(now);
  };

  const banExpiresAt = duration === 'permanent' ? null : calculateExpiryDate(duration);

  const updateFields = {
    status: 'banned',
    bannedAt: admin.firestore.FieldValue.serverTimestamp(),
    bannedBy: adminUid,
    banReason: reason || 'No reason provided',
    banExpiresAt: banExpiresAt,
  };

  await db.collection('users').doc(userId).update(updateFields);
  await db.collection('profiles').doc(userId).update(updateFields);

  await db.collection('moderation_log').add({
    action: 'ban',
    userId,
    reason: reason || 'No reason provided',
    duration: duration || 'permanent',
    moderatorId: adminUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('admin_logs').add({
    adminEmail,
    action: 'Ban User Account',
    targetId: userId,
    details: { reason, duration, bannedByAdminUid: adminUid },
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  deleteFromCacheByPattern(`profile:${userId}`);
  deleteFromCacheByPattern(`user:${userId}`);
};

export const unbanUserAccount = async (userId: string, adminUid: string, adminEmail: string): Promise<void> => {
  try {
    await admin.auth().updateUser(userId, { disabled: false });
  } catch (authErr) {
    console.warn(`Could not re-enable Auth user ${userId}:`, authErr);
  }

  const removeFields = {
    status: 'Active',
    bannedAt: admin.firestore.FieldValue.delete(),
    bannedBy: admin.firestore.FieldValue.delete(),
    banReason: admin.firestore.FieldValue.delete(),
    banExpiresAt: admin.firestore.FieldValue.delete(),
  };

  await db.collection('users').doc(userId).update(removeFields);
  await db.collection('profiles').doc(userId).update(removeFields);

  await db.collection('moderation_log').add({
    action: 'unban',
    userId,
    moderatorId: adminUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection('admin_logs').add({
    adminEmail,
    action: 'Unban User Account',
    targetId: userId,
    details: { unbannedByAdminUid: adminUid },
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  deleteFromCacheByPattern(`profile:${userId}`);
  deleteFromCacheByPattern(`user:${userId}`);
};
