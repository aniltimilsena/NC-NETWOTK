import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import crypto from "crypto";
import { callableOptions, db, DEFAULT_REGION } from "../config";
import { assertAuth, assertAdmin } from "../lib/validation";
import { enforceRateLimit, logSecurityEvent } from "../lib/rateLimit";
import {
  AdminUserActionSchema,
  AdminBanUserSchema,
  AdminUpdateUserRoleSchema,
  AdminDataRequestSchema
} from "../schemas";

export const checkExpiredBans = onSchedule(
  {
    schedule: "every 24 hours",
    region: DEFAULT_REGION,
    maxInstances: 5,
  },
  async () => {
    const now = Timestamp.now();
    const expiredBans = await db
      .collection("users")
      .where("status", "==", "banned")
      .where("banExpiresAt", "<=", now)
      .get();

    if (expiredBans.empty) {
      logger.info("No expired bans found.");
      return;
    }

    const batch = db.batch();
    const auth = getAuth();

    for (const doc of expiredBans.docs) {
      try {
        await auth.updateUser(doc.id, { disabled: false });

        batch.update(doc.ref, {
          status: 'Active',
          bannedAt: FieldValue.delete(),
          bannedBy: FieldValue.delete(),
          banReason: FieldValue.delete(),
          banExpiresAt: FieldValue.delete(),
        });

        const profileRef = db.collection("profiles").doc(doc.id);
        batch.update(profileRef, {
          status: 'Active',
          bannedAt: FieldValue.delete(),
          bannedBy: FieldValue.delete(),
          banReason: FieldValue.delete(),
          banExpiresAt: FieldValue.delete(),
        });
      } catch (err) {
        logger.error(`Failed to unban user ${doc.id}:`, err);
      }
    }

    await batch.commit();
    logger.info(`Auto-unbanned ${expiredBans.size} users`);
  }
);

export const adminDeleteUser = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminUserActionSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid user delete payload");
  }

  const { userId } = parsed.data;
  await enforceRateLimit(authCtx.uid, "adminDeleteUser", 10, 60);

  const auth = getAuth();
  try {
    try { await auth.revokeRefreshTokens(userId); } catch {}
    try { await auth.deleteUser(userId); } catch {}

    const sessionsSnap = await db.collection("profiles").doc(userId).collection("sessions").get();
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
    
    batch.delete(db.collection("users").doc(userId));
    batch.delete(db.collection("profiles").doc(userId));
    await batch.commit();

    const collectionsToClean = [
      { name: "casting_calls", field: "createdBy" },
      { name: "saved_calls", field: "userId" },
      { name: "data_requests", field: "userId" },
      { name: "follows", field: "followerId" },
      { name: "follows", field: "followingId" },
      { name: "applications", field: "userId" },
      { name: "applications", field: "creatorId" },
      { name: "notifications", field: "userId" },
      { name: "notifications", field: "recipientId" },
      { name: "notifications", field: "receiverId" },
      { name: "notifications", field: "senderId" },
      { name: "reviews", field: "reviewerId" },
      { name: "reviews", field: "targetUserId" },
      { name: "reviews", field: "targetUid" },
      { name: "reports", field: "reporterId" },
      { name: "reports", field: "targetUserId" }
    ];

    for (const col of collectionsToClean) {
      try {
        const snap = await db.collection(col.name).where(col.field, "==", userId).get();
        if (!snap.empty) {
          let colBatch = db.batch();
          let colCount = 0;
          for (const doc of snap.docs) {
            colBatch.delete(doc.ref);
            colCount++;
            if (colCount === 400) {
              await colBatch.commit();
              colBatch = db.batch();
              colCount = 0;
            }
          }
          if (colCount > 0) {
            await colBatch.commit();
          }
        }
      } catch (colErr) {
        logger.error(`Error cleaning up collection ${col.name} (field ${col.field}) for user ${userId}:`, colErr);
      }
    }

    await db.collection("deleted_users").add({
      userId,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: authCtx.uid,
    });

    await logSecurityEvent("user.admin.delete", "critical", authCtx.uid, { deletedUserId: userId });
    await db.collection("admin_logs").add({
      adminEmail: authCtx.token.email || "Unknown Admin",
      action: "Delete User Account",
      targetId: userId,
      details: { deletedByAdminUid: authCtx.uid },
      timestamp: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    logger.error("adminDeleteUser internal error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An unexpected error occurred while deleting user.");
  }
});

export const adminBanUser = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminBanUserSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid user ban payload");
  }

  const { userId, reason, duration } = parsed.data;
  await enforceRateLimit(authCtx.uid, "adminBanUser", 10, 60);

  let banExpiresAt: Timestamp | null = null;
  if (duration && duration !== "permanent") {
    const match = duration.match(/^(\d+)([d])$/);
    if (match) {
      const days = parseInt(match[1], 10);
      banExpiresAt = Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
    }
  }

  const auth = getAuth();
  try {
    await auth.updateUser(userId, { disabled: true });
    await auth.revokeRefreshTokens(userId);

    const updatePayload: Record<string, any> = {
      status: "banned",
      bannedAt: FieldValue.serverTimestamp(),
      bannedBy: authCtx.uid,
      banReason: reason || "No reason provided",
    };
    if (banExpiresAt) {
      updatePayload.banExpiresAt = banExpiresAt;
    }

    const batch = db.batch();
    batch.update(db.collection("users").doc(userId), updatePayload);
    batch.update(db.collection("profiles").doc(userId), updatePayload);
    await batch.commit();

    await logSecurityEvent("user.admin.ban", "warning", authCtx.uid, { bannedUserId: userId, reason, duration });
    await db.collection("admin_logs").add({
      adminEmail: authCtx.token.email || "Unknown Admin",
      action: "Ban User Account",
      targetId: userId,
      details: { bannedByAdminUid: authCtx.uid, reason, duration },
      timestamp: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    logger.error("adminBanUser internal error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An unexpected error occurred while banning user.");
  }
});

export const adminUnbanUser = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminUserActionSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid user unban payload");
  }

  const { userId } = parsed.data;
  await enforceRateLimit(authCtx.uid, "adminUnbanUser", 10, 60);

  const auth = getAuth();
  try {
    await auth.updateUser(userId, { disabled: false });

    const batch = db.batch();
    const updatePayload = {
      status: "Active",
      bannedAt: FieldValue.delete(),
      bannedBy: FieldValue.delete(),
      banReason: FieldValue.delete(),
      banExpiresAt: FieldValue.delete(),
    };
    batch.update(db.collection("users").doc(userId), updatePayload);
    batch.update(db.collection("profiles").doc(userId), updatePayload);
    await batch.commit();

    await logSecurityEvent("user.admin.unban", "info", authCtx.uid, { unbannedUserId: userId });
    await db.collection("admin_logs").add({
      adminEmail: authCtx.token.email || "Unknown Admin",
      action: "Unban User Account",
      targetId: userId,
      details: { unbannedByAdminUid: authCtx.uid },
      timestamp: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (err: any) {
    logger.error("adminUnbanUser internal error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An unexpected error occurred while unbanning user.");
  }
});

export const adminUpdateUserRole = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminUpdateUserRoleSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid user role update payload");
  }

  const { userId, makeAdmin } = parsed.data;
  if (userId === authCtx.uid) {
    throw new HttpsError("invalid-argument", "Cannot modify your own admin status");
  }

  await enforceRateLimit(authCtx.uid, "adminUpdateUserRole", 10, 60);

  const auth = getAuth();
  try {
    const nextRole = makeAdmin ? "Admin" : "Talent";

    const batch = db.batch();
    batch.update(db.collection("users").doc(userId), { isAdmin: makeAdmin, role: nextRole });
    batch.update(db.collection("profiles").doc(userId), { isAdmin: makeAdmin, role: nextRole });
    await batch.commit();

    await auth.setCustomUserClaims(userId, { admin: makeAdmin });

    await logSecurityEvent("user.admin.roleUpdate", "warning", authCtx.uid, { targetUserId: userId, makeAdmin });
    await db.collection("admin_logs").add({
      adminEmail: authCtx.token.email || "Unknown Admin",
      action: "Update User Role",
      targetId: userId,
      details: { updatedByAdminUid: authCtx.uid, makeAdmin, role: nextRole },
      timestamp: FieldValue.serverTimestamp(),
    });
    return { success: true, role: nextRole, isAdmin: makeAdmin };
  } catch (err: any) {
    logger.error("adminUpdateUserRole internal error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An unexpected error occurred while updating user role.");
  }
});

export const adminApproveDataRequest = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminDataRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid data request payload");
  }

  const { requestId } = parsed.data;
  await enforceRateLimit(authCtx.uid, "adminApproveDataRequest", 10, 60);

  try {
    const requestRef = db.collection("data_requests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Request not found");
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== "pending") {
      throw new HttpsError("failed-precondition", "Request is not pending");
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await db.collection("one_time_tokens").doc(token).set({
      uid: requestData.userId,
      requestId: requestId,
      expiresAt: expiresAt,
      createdAt: Date.now(),
    });

    const downloadLink = `${process.env.APP_URL || "https://nc-netwotk.vercel.app"}/api/data-export/download?token=${token}`;

    await requestRef.update({
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: authCtx.uid,
      downloadLink: downloadLink,
      expiresAt: Timestamp.fromMillis(expiresAt),
    });

    await logSecurityEvent("dataRequest.admin.approve", "info", authCtx.uid, { requestId, targetUserId: requestData.userId });
    return { success: true, downloadLink };
  } catch (err: any) {
    logger.error("adminApproveDataRequest internal error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An unexpected error occurred while approving data request.");
  }
});

export const adminRejectDataRequest = onCall(callableOptions, async (request) => {
  const authCtx = assertAuth(request.auth);
  await assertAdmin(authCtx);
  const parsed = AdminDataRequestSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "Invalid data request payload");
  }

  const { requestId, reason } = parsed.data;
  if (!reason || reason.trim().length < 5) {
    throw new HttpsError("invalid-argument", "Please enter a rejection reason (minimum 5 characters)");
  }

  await enforceRateLimit(authCtx.uid, "adminRejectDataRequest", 10, 60);

  try {
    const requestRef = db.collection("data_requests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      throw new HttpsError("not-found", "Request not found");
    }

    const requestData = requestDoc.data();
    if (requestData?.status !== "pending") {
      throw new HttpsError("failed-precondition", "Request is not pending");
    }

    await requestRef.update({
      status: "rejected",
      rejectedAt: FieldValue.serverTimestamp(),
      rejectedBy: authCtx.uid,
      rejectionReason: reason,
    });

    await logSecurityEvent("dataRequest.admin.reject", "info", authCtx.uid, { requestId, reason, targetUserId: requestData.userId });
    return { success: true };
  } catch (err: any) {
    logger.error("adminRejectDataRequest internal error:", err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("internal", "An unexpected error occurred while rejecting data request.");
  }
});
