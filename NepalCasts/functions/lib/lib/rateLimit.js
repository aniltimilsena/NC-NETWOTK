"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = exports.enforceRateLimit = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-admin/firestore");
const db = (0, firestore_2.getFirestore)();
const enforceRateLimit = async (uid, action, maxRequests, windowSeconds) => {
    const nowMs = Date.now();
    const windowStartMs = nowMs - windowSeconds * 1000;
    const rateRef = db.collection("securityRateLimits").doc(`${action}:${uid}`);
    await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(rateRef);
        const data = snap.data();
        const firstRequestAtMs = data?.firstRequestAt?.toMillis?.() ?? nowMs;
        const isWindowExpired = firstRequestAtMs < windowStartMs;
        const nextCount = isWindowExpired ? 1 : (data?.count ?? 0) + 1;
        if (nextCount > maxRequests) {
            throw new https_1.HttpsError("resource-exhausted", `Rate limit exceeded for action ${action}`);
        }
        transaction.set(rateRef, {
            action,
            uid,
            count: nextCount,
            firstRequestAt: isWindowExpired ? firestore_1.Timestamp.fromMillis(nowMs) : data?.firstRequestAt ?? firestore_1.Timestamp.fromMillis(nowMs),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
};
exports.enforceRateLimit = enforceRateLimit;
const logSecurityEvent = async (eventType, severity, uid, details) => {
    console.log("security_event", { eventType, severity, uid, ...details });
    await db.collection("securityEvents").add({
        eventType,
        severity,
        uid,
        details,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
};
exports.logSecurityEvent = logSecurityEvent;
//# sourceMappingURL=rateLimit.js.map