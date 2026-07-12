"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRejectDataRequest = exports.adminApproveDataRequest = exports.adminUpdateUserRole = exports.adminUnbanUser = exports.adminBanUser = exports.adminDeleteUser = exports.checkExpiredBans = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const logger = __importStar(require("firebase-functions/logger"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
const validation_1 = require("../lib/validation");
const rateLimit_1 = require("../lib/rateLimit");
const schemas_1 = require("../schemas");
exports.checkExpiredBans = (0, scheduler_1.onSchedule)({
    schedule: "every 24 hours",
    region: config_1.DEFAULT_REGION,
    maxInstances: 5,
}, async () => {
    const now = firestore_1.Timestamp.now();
    const expiredBans = await config_1.db
        .collection("users")
        .where("status", "==", "banned")
        .where("banExpiresAt", "<=", now)
        .get();
    if (expiredBans.empty) {
        logger.info("No expired bans found.");
        return;
    }
    const batch = config_1.db.batch();
    const auth = (0, auth_1.getAuth)();
    for (const doc of expiredBans.docs) {
        try {
            await auth.updateUser(doc.id, { disabled: false });
            batch.update(doc.ref, {
                status: 'Active',
                bannedAt: firestore_1.FieldValue.delete(),
                bannedBy: firestore_1.FieldValue.delete(),
                banReason: firestore_1.FieldValue.delete(),
                banExpiresAt: firestore_1.FieldValue.delete(),
            });
            const profileRef = config_1.db.collection("profiles").doc(doc.id);
            batch.update(profileRef, {
                status: 'Active',
                bannedAt: firestore_1.FieldValue.delete(),
                bannedBy: firestore_1.FieldValue.delete(),
                banReason: firestore_1.FieldValue.delete(),
                banExpiresAt: firestore_1.FieldValue.delete(),
            });
        }
        catch (err) {
            logger.error(`Failed to unban user ${doc.id}:`, err);
        }
    }
    await batch.commit();
    logger.info(`Auto-unbanned ${expiredBans.size} users`);
});
exports.adminDeleteUser = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminUserActionSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user delete payload");
    }
    const { userId } = parsed.data;
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminDeleteUser", 10, 60);
    const auth = (0, auth_1.getAuth)();
    try {
        try {
            await auth.revokeRefreshTokens(userId);
        }
        catch { }
        try {
            await auth.deleteUser(userId);
        }
        catch { }
        const sessionsSnap = await config_1.db.collection("profiles").doc(userId).collection("sessions").get();
        let batch = config_1.db.batch();
        let count = 0;
        for (const doc of sessionsSnap.docs) {
            batch.delete(doc.ref);
            count++;
            if (count === 400) {
                await batch.commit();
                batch = config_1.db.batch();
                count = 0;
            }
        }
        batch.delete(config_1.db.collection("users").doc(userId));
        batch.delete(config_1.db.collection("profiles").doc(userId));
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
                const snap = await config_1.db.collection(col.name).where(col.field, "==", userId).get();
                if (!snap.empty) {
                    let colBatch = config_1.db.batch();
                    let colCount = 0;
                    for (const doc of snap.docs) {
                        colBatch.delete(doc.ref);
                        colCount++;
                        if (colCount === 400) {
                            await colBatch.commit();
                            colBatch = config_1.db.batch();
                            colCount = 0;
                        }
                    }
                    if (colCount > 0) {
                        await colBatch.commit();
                    }
                }
            }
            catch (colErr) {
                logger.error(`Error cleaning up collection ${col.name} (field ${col.field}) for user ${userId}:`, colErr);
            }
        }
        await config_1.db.collection("deleted_users").add({
            userId,
            deletedAt: firestore_1.FieldValue.serverTimestamp(),
            deletedBy: authCtx.uid,
        });
        await (0, rateLimit_1.logSecurityEvent)("user.admin.delete", "critical", authCtx.uid, { deletedUserId: userId });
        await config_1.db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Delete User Account",
            targetId: userId,
            details: { deletedByAdminUid: authCtx.uid },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to delete user");
    }
});
exports.adminBanUser = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminBanUserSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user ban payload");
    }
    const { userId, reason, duration } = parsed.data;
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminBanUser", 10, 60);
    let banExpiresAt = null;
    if (duration && duration !== "permanent") {
        const match = duration.match(/^(\d+)([d])$/);
        if (match) {
            const days = parseInt(match[1], 10);
            banExpiresAt = firestore_1.Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000);
        }
    }
    const auth = (0, auth_1.getAuth)();
    try {
        await auth.updateUser(userId, { disabled: true });
        await auth.revokeRefreshTokens(userId);
        const updatePayload = {
            status: "banned",
            bannedAt: firestore_1.FieldValue.serverTimestamp(),
            bannedBy: authCtx.uid,
            banReason: reason || "No reason provided",
        };
        if (banExpiresAt) {
            updatePayload.banExpiresAt = banExpiresAt;
        }
        const batch = config_1.db.batch();
        batch.update(config_1.db.collection("users").doc(userId), updatePayload);
        batch.update(config_1.db.collection("profiles").doc(userId), updatePayload);
        await batch.commit();
        await (0, rateLimit_1.logSecurityEvent)("user.admin.ban", "warning", authCtx.uid, { bannedUserId: userId, reason, duration });
        await config_1.db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Ban User Account",
            targetId: userId,
            details: { bannedByAdminUid: authCtx.uid, reason, duration },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to ban user");
    }
});
exports.adminUnbanUser = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminUserActionSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user unban payload");
    }
    const { userId } = parsed.data;
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminUnbanUser", 10, 60);
    const auth = (0, auth_1.getAuth)();
    try {
        await auth.updateUser(userId, { disabled: false });
        const batch = config_1.db.batch();
        const updatePayload = {
            status: "Active",
            bannedAt: firestore_1.FieldValue.delete(),
            bannedBy: firestore_1.FieldValue.delete(),
            banReason: firestore_1.FieldValue.delete(),
            banExpiresAt: firestore_1.FieldValue.delete(),
        };
        batch.update(config_1.db.collection("users").doc(userId), updatePayload);
        batch.update(config_1.db.collection("profiles").doc(userId), updatePayload);
        await batch.commit();
        await (0, rateLimit_1.logSecurityEvent)("user.admin.unban", "info", authCtx.uid, { unbannedUserId: userId });
        await config_1.db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Unban User Account",
            targetId: userId,
            details: { unbannedByAdminUid: authCtx.uid },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to unban user");
    }
});
exports.adminUpdateUserRole = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminUpdateUserRoleSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid user role update payload");
    }
    const { userId, makeAdmin } = parsed.data;
    if (userId === authCtx.uid) {
        throw new https_1.HttpsError("invalid-argument", "Cannot modify your own admin status");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminUpdateUserRole", 10, 60);
    const auth = (0, auth_1.getAuth)();
    try {
        const nextRole = makeAdmin ? "Admin" : "Talent";
        const batch = config_1.db.batch();
        batch.update(config_1.db.collection("users").doc(userId), { isAdmin: makeAdmin, role: nextRole });
        batch.update(config_1.db.collection("profiles").doc(userId), { isAdmin: makeAdmin, role: nextRole });
        await batch.commit();
        await auth.setCustomUserClaims(userId, { admin: makeAdmin });
        await (0, rateLimit_1.logSecurityEvent)("user.admin.roleUpdate", "warning", authCtx.uid, { targetUserId: userId, makeAdmin });
        await config_1.db.collection("admin_logs").add({
            adminEmail: authCtx.token.email || "Unknown Admin",
            action: "Update User Role",
            targetId: userId,
            details: { updatedByAdminUid: authCtx.uid, makeAdmin, role: nextRole },
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true, role: nextRole, isAdmin: makeAdmin };
    }
    catch (err) {
        throw new https_1.HttpsError("internal", err.message || "Failed to update user role");
    }
});
exports.adminApproveDataRequest = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminDataRequestSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid data request payload");
    }
    const { requestId } = parsed.data;
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminApproveDataRequest", 10, 60);
    try {
        const requestRef = config_1.db.collection("data_requests").doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists) {
            throw new https_1.HttpsError("not-found", "Request not found");
        }
        const requestData = requestDoc.data();
        if (requestData?.status !== "pending") {
            throw new https_1.HttpsError("failed-precondition", "Request is not pending");
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        await config_1.db.collection("one_time_tokens").doc(token).set({
            uid: requestData.userId,
            requestId: requestId,
            expiresAt: expiresAt,
            createdAt: Date.now(),
        });
        const downloadLink = `${process.env.APP_URL || "https://nc-netwotk.vercel.app"}/api/data-export/download?token=${token}`;
        await requestRef.update({
            status: "approved",
            approvedAt: firestore_1.FieldValue.serverTimestamp(),
            approvedBy: authCtx.uid,
            downloadLink: downloadLink,
            expiresAt: firestore_1.Timestamp.fromMillis(expiresAt),
        });
        await (0, rateLimit_1.logSecurityEvent)("dataRequest.admin.approve", "info", authCtx.uid, { requestId, targetUserId: requestData.userId });
        return { success: true, downloadLink };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError("internal", err.message || "Failed to approve data request");
    }
});
exports.adminRejectDataRequest = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    await (0, validation_1.assertAdmin)(authCtx);
    const parsed = schemas_1.AdminDataRequestSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid data request payload");
    }
    const { requestId, reason } = parsed.data;
    if (!reason || reason.trim().length < 5) {
        throw new https_1.HttpsError("invalid-argument", "Please enter a rejection reason (minimum 5 characters)");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "adminRejectDataRequest", 10, 60);
    try {
        const requestRef = config_1.db.collection("data_requests").doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists) {
            throw new https_1.HttpsError("not-found", "Request not found");
        }
        const requestData = requestDoc.data();
        if (requestData?.status !== "pending") {
            throw new https_1.HttpsError("failed-precondition", "Request is not pending");
        }
        await requestRef.update({
            status: "rejected",
            rejectedAt: firestore_1.FieldValue.serverTimestamp(),
            rejectedBy: authCtx.uid,
            rejectionReason: reason,
        });
        await (0, rateLimit_1.logSecurityEvent)("dataRequest.admin.reject", "info", authCtx.uid, { requestId, reason, targetUserId: requestData.userId });
        return { success: true };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError("internal", err.message || "Failed to reject data request");
    }
});
//# sourceMappingURL=admin.js.map