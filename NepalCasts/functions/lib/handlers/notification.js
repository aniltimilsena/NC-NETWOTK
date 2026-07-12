"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const config_1 = require("../config");
const validation_1 = require("../lib/validation");
const rateLimit_1 = require("../lib/rateLimit");
const schemas_1 = require("../schemas");
exports.registerNotificationToken = (0, https_1.onCall)(config_1.callableOptions, async (request) => {
    const authCtx = (0, validation_1.assertAuth)(request.auth);
    const parsed = schemas_1.NotificationTokenSchema.safeParse(request.data);
    if (!parsed.success) {
        throw new https_1.HttpsError("invalid-argument", "Invalid notification token payload");
    }
    await (0, rateLimit_1.enforceRateLimit)(authCtx.uid, "registerNotificationToken", 20, 300);
    const privateSettingsRef = config_1.db.collection("users").doc(authCtx.uid).collection("private").doc("settings");
    await config_1.db.runTransaction(async (transaction) => {
        const settingsSnapshot = await transaction.get(privateSettingsRef);
        const existingRaw = settingsSnapshot.data()?.fcmTokens;
        const existingTokens = Array.isArray(existingRaw)
            ? existingRaw.filter((item) => typeof item === "string")
            : [];
        if (existingTokens.includes(parsed.data.token)) {
            return;
        }
        if (existingTokens.length >= config_1.MAX_FCM_TOKENS) {
            throw new https_1.HttpsError("resource-exhausted", `FCM token limit reached (${config_1.MAX_FCM_TOKENS})`);
        }
        transaction.set(privateSettingsRef, {
            fcmTokens: firestore_1.FieldValue.arrayUnion(parsed.data.token),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    await (0, rateLimit_1.logSecurityEvent)("notifications.token.register", "info", authCtx.uid, {});
    return { success: true };
});
//# sourceMappingURL=notification.js.map